import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { Configuration, DogsApi, SwipesApi } from '../generated';
import { getIdToken, getAccessToken } from '../services/CognitoService';
import { Dog, AdopterProfile, ShelterProfile } from '../App';
import { gql } from '@apollo/client';

global.Buffer = Buffer;

// ================== API ENDPOINT CONSTANTS ==================
const API_ENDPOINTS = {
  PRESIGN_IMAGE_URLS: process.env.EXPO_PUBLIC_PRESIGN_IMAGE_URLS_API || '',
  DOG_API_BASE: process.env.EXPO_PUBLIC_DOG_API_BASE || '',
  ADOPTER_API_BASE: process.env.EXPO_PUBLIC_ADOPTER_API_BASE || '',
  SHELTER_API_BASE: process.env.EXPO_PUBLIC_SHELTER_API_BASE || '',
  CHAT_API_BASE: process.env.EXPO_PUBLIC_CHAT_API_BASE || '',
  SWIPE_API_BASE: process.env.EXPO_PUBLIC_SWIPE_API_BASE || '',
} as const;

// ================== UTILITY FUNCTIONS ==================

// Utility function to create timeout signal for React Native compatibility
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

// Retry utility function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Circuit breaker pattern for API resilience
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open - service temporarily unavailable');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    return this.failureCount >= this.threshold && 
           (Date.now() - this.lastFailureTime) < this.timeout;
  }

  private onSuccess(): void {
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }
}

const adopterApiCircuitBreaker = new CircuitBreaker();

// ================== MAIN API FUNCTIONS ==================

export async function getPresignedUrls(fileCount: number, token: string): Promise<{ uploadUrls: string[], keys: string[] }> {
  const response = await fetch(API_ENDPOINTS.PRESIGN_IMAGE_URLS, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ count: fileCount }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get pre-signed URLs: ${text}`);
  }

  const json = await response.json();
  console.log('Presigned URL response:', json);

  const uploadUrls = json.uploadUrls ?? json.urls ?? [];
  const keys = json.keys ?? [];

  return { uploadUrls, keys };
}

export async function uploadImagesToS3(uris: string[], urls: string[]) {
  const uploads = uris.map(async (uri, i) => {
    const res = await fetch(uri);
    const blob = await res.blob();

    const uploadRes = await fetch(urls[i], {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: blob,
    });

    return uploadRes;
  });

  const results = await Promise.all(uploads);
  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    throw new Error("One or more uploads failed.");
  }
}

export async function uploadDogProfile(data: any, token: string) {
  const response = await fetch(`${API_ENDPOINTS.DOG_API_BASE}/dog`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return response;
}

export async function deleteDog(dogId: string, dogCreatedAt: string, token: string) {
  const response = await fetch(`${API_ENDPOINTS.DOG_API_BASE}/dog/${dogId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-created-at': dogCreatedAt,
    },
  });

  return response;
}

export async function updateDogProfile(dogId: string, data: any, token: string) {
  console.log('Frontend updating dog with this data:', JSON.stringify(data, null, 2));
  
  const response = await fetch(`${API_ENDPOINTS.DOG_API_BASE}/dog/${dogId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return response;
}

export const dogApiConfig = new Configuration({
  basePath: API_ENDPOINTS.DOG_API_BASE,
  accessToken: async () => (await getIdToken()) ?? '',
});

export const dogsApi = new DogsApi(dogApiConfig);

export const swipeApiConfig = new Configuration({
  basePath: API_ENDPOINTS.SWIPE_API_BASE,
  accessToken: async () => (await getIdToken()) ?? ''
})

export const swipesApi = new SwipesApi(swipeApiConfig);

export async function getDogProfileById(dogId: string, dogCreatedAt: string, token: string): Promise<Dog> {
  const response = await fetch(`${API_ENDPOINTS.DOG_API_BASE}/dog/${dogId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-created-at': dogCreatedAt,
      'Content-Type': 'application/json'
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get dog profile: ${text}`);
  }

  return response.json();
}

// Function to fetch details for multiple dogs by their IDs
export async function getDogsByIds(dogsInfo: Array<{ dogId: string; dogCreatedAt: string }>): Promise<Dog[]> {
    const token = await getIdToken();
    if (!token) {
      throw new Error("No token available. Please log in.");
    }

    // Use Promise.all to fetch all dogs concurrently for better performance
    const fetchPromises = dogsInfo.map(async ({ dogId, dogCreatedAt }) => {
        try {
            return await getDogProfileById(dogId, dogCreatedAt, token);
        } catch (error) {
            console.error(`Failed to fetch dog with ID ${dogId}:`, error);
            // Return null so we can filter out failed requests later
            return null;
        }
    });

    const results = await Promise.all(fetchPromises);
    
    // Filter out any null results from failed fetches
    return results.filter(dog => dog !== null) as Dog[];
}

// Improved adopters API with retry logic and error handling
export async function getAdoptersByIds(adopterIds: string[]): Promise<AdopterProfile[]> {
  if (adopterIds.length === 0) return [];
  
  const token = await getIdToken();
  if (!token) throw new Error("Authentication token not found.");

  try {
    return await retryWithBackoff(async () => {
      const response = await fetch(`${API_ENDPOINTS.ADOPTER_API_BASE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adopterIds }),
        signal: createTimeoutSignal(10000) // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response.json();
    }, 2, 500); // Reduced to 2 retries with 500ms base delay
    
  } catch (error) {
    console.error('Failed to fetch adopter profiles after retries:', error);
    
    // Return fallback data for all requested IDs
    return adopterIds.map(id => ({
      adopterId: id,
      adopterName: `Adopter (${id.substring(0, 8)})`,
      iconUrl: 'https://via.placeholder.com/50/FFDDC1/000000?text=AD'
    } as AdopterProfile));
  }
}

// Shelters API with retry logic and error handling
export async function getSheltersByIds(shelterIds: string[]): Promise<ShelterProfile[]> {
  if (shelterIds.length === 0) return [];
  
  const token = await getIdToken();
  if (!token) throw new Error("Authentication token not found.");

  try {
    return await retryWithBackoff(async () => {
      const response = await fetch(`${API_ENDPOINTS.SHELTER_API_BASE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shelterIds }),
        signal: createTimeoutSignal(10000) // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response.json();
    }, 2, 500); // 2 retries with 500ms base delay
    
  } catch (error) {
    console.error('Failed to fetch shelter profiles after retries:', error);
    
    // Return fallback data for all requested IDs
    return shelterIds.map(id => ({
      shelterId: id,
      shelterName: `Shelter (${id.substring(0, 8)})`,
      email: `shelter${id.substring(0, 4)}@example.com`,
      contact: '+44 20 XXXX XXXX',
      address: { formatted: 'Location not available' },
      postcode: 'SW1A 1AA',
      iconUrl: 'https://via.placeholder.com/50/C1FFDD/000000?text=SH'
    } as ShelterProfile));
  }
}

// ================== CHAT API FUNCTIONS ==================

// Interface for raw chat data from DynamoDB
interface RawChatData {
  chatId: string;
  adopterId: string;
  shelterId: string;
  dogId: string;
  dogCreatedAt: string;
  status: string;
  createdAt: string;
}

// Interface for enriched chat data for the frontend
export interface EnrichedChatData {
  chatId: string;
  dogId: string;
  dogName: string;
  dogCreatedAt: string;
  dogPhotoUrl?: string;
  shelterId: string;
  shelterName: string;
  adopterId: string;
  adopterName: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  status: 'pending_request' | 'active' | 'closed' | 'rejected';
  unreadCount?: number;
  otherParticipantPhotoUrl: string;
}

// Fetch all chats for current user
export async function fetchUserChats(): Promise<RawChatData[]> {
  const token = await getIdToken();
  if (!token) {
    throw new Error("No token available. Please log in.");
  }

  const response = await fetch(API_ENDPOINTS.CHAT_API_BASE, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch chats: ${text}`);
  }

  const data = await response.json();
  return data.chats || [];
}

// Fetch shelter details by ID
export async function getShelterDetails(shelterId: string): Promise<{ name: string; photoUrl?: string }> {
  try {
    const shelters = await getSheltersByIds([shelterId]);
    if (shelters.length > 0) {
      const shelter = shelters[0];
      return {
        name: shelter.shelterName,
        photoUrl: shelter.iconUrl
      };
    }
  } catch (error) {
    console.warn(`Failed to fetch shelter details for ${shelterId}:`, error);
  }
  
  // Fallback data
  return {
    name: `Shelter (${shelterId.substring(0, 8)})`,
    photoUrl: 'https://via.placeholder.com/50/C1FFDD/000000?text=SH'
  };
}

// Improved adopter details fetching with circuit breaker
export async function getAdopterDetails(adopterId: string): Promise<{ name: string; photoUrl?: string }> {
  try {
    return await adopterApiCircuitBreaker.execute(async () => {
      const adopters = await getAdoptersByIds([adopterId]);
      const adopter = adopters[0];
      if (adopter) {
        return {
          name: adopter.adopterName,
          photoUrl: adopter.iconUrl || 'https://via.placeholder.com/50/FFDDC1/000000?text=AD'
        };
      }
      throw new Error('Adopter not found');
    });
  } catch (error) {
    console.error(`Failed to fetch adopter details for ${adopterId}:`, error);
    
    // Enhanced fallback with more descriptive placeholder
    return {
      name: `Adopter (${adopterId.substring(0, 8)})`,
      photoUrl: 'https://via.placeholder.com/50/FFDDC1/000000?text=AD'
    };
  }
}

// Improved chat data enrichment with better error resilience
export async function enrichChatData(rawChats: RawChatData[], userRole: 'adopter' | 'shelter'): Promise<EnrichedChatData[]> {
  // Process chats in smaller batches to avoid overwhelming APIs
  const BATCH_SIZE = 5;
  const results: EnrichedChatData[] = [];
  
  for (let i = 0; i < rawChats.length; i += BATCH_SIZE) {
    const batch = rawChats.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (chat) => {
        try {
          // Fetch dog details with timeout protection
          let dogName = `Dog ${chat.dogId.substring(0, 8)}`;
          let dogPhotoUrl = 'https://via.placeholder.com/50/FFE4B5/000000?text=DOG';
          
          try {
            const dogData = await Promise.race([
              getDogProfileById(chat.dogId, chat.dogCreatedAt, await getIdToken() || ''),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Dog fetch timeout')), 8000)
              )
            ]);
            
            dogName = dogData.name || dogName;
            if (dogData.photoURLs && dogData.photoURLs.length > 0) {
              dogPhotoUrl = dogData.photoURLs[0];
            }
            console.log(`Successfully fetched dog: ${dogName}`);
          } catch (error) {
            console.warn(`Failed to fetch dog details for ${chat.dogId}:`, error);
          }

          // Fetch user details with improved error handling
          let shelterName = `Shelter (${chat.shelterId.substring(0, 8)})`;
          let adopterName = `Adopter (${chat.adopterId.substring(0, 8)})`;
          let otherParticipantPhotoUrl = 'https://via.placeholder.com/50/CCCCCC/000000?text=?';

          // Use Promise.allSettled to handle partial failures gracefully
          const [shelterResult, adopterResult] = await Promise.allSettled([
            getShelterDetails(chat.shelterId),
            getAdopterDetails(chat.adopterId)
          ]);

          if (shelterResult.status === 'fulfilled') {
            shelterName = shelterResult.value.name;
            if (userRole === 'adopter') {
              otherParticipantPhotoUrl = shelterResult.value.photoUrl || 'https://via.placeholder.com/50/C1FFDD/000000?text=SH';
            }
          } else {
            console.warn(`Failed to fetch shelter details for ${chat.shelterId}:`, shelterResult.reason);
          }

          if (adopterResult.status === 'fulfilled') {
            adopterName = adopterResult.value.name;
            if (userRole === 'shelter') {
              otherParticipantPhotoUrl = adopterResult.value.photoUrl || 'https://via.placeholder.com/50/FFDDC1/000000?text=AD';
            }
          } else {
            console.warn(`Failed to fetch adopter details for ${chat.adopterId}:`, adopterResult.reason);
          }

          return {
            chatId: chat.chatId,
            dogId: chat.dogId,
            dogName,
            dogCreatedAt: chat.dogCreatedAt,
            dogPhotoUrl,
            shelterId: chat.shelterId,
            shelterName,
            adopterId: chat.adopterId,
            adopterName,
            lastMessageAt: chat.createdAt, // TODO: Replace with actual last message time
            lastMessagePreview: 'Chat created', // TODO: Replace with actual last message
            status: chat.status as 'pending_request' | 'active' | 'closed' | 'rejected',
            unreadCount: 0, // TODO: Implement unread count
            otherParticipantPhotoUrl
          };
        } catch (error) {
          console.error(`Failed to enrich chat data for ${chat.chatId}:`, error);
          
          // Return minimal fallback data
          return {
            chatId: chat.chatId,
            dogId: chat.dogId,
            dogName: `Dog ${chat.dogId.substring(0, 8)}`,
            dogCreatedAt: chat.dogCreatedAt || '2024-01-01T00:00:00Z',
            shelterId: chat.shelterId,
            shelterName: `Shelter (${chat.shelterId.substring(0, 8)})`,
            adopterId: chat.adopterId,
            adopterName: `Adopter (${chat.adopterId.substring(0, 8)})`,
            lastMessageAt: chat.createdAt,
            lastMessagePreview: 'Chat created',
            status: chat.status as 'pending_request' | 'active' | 'closed' | 'rejected',
            unreadCount: 0,
            otherParticipantPhotoUrl: 'https://via.placeholder.com/50/CCCCCC/000000?text=?'
          };
        }
      })
    );

    // Extract successful results and add to final array
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });

    // Add small delay between batches to be gentle on the APIs
    if (i + BATCH_SIZE < rawChats.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

// ================== GRAPHQL QUERIES & MUTATIONS ==================

export const GET_MESSAGES = gql`
  query GetMessages($chatId: ID!) {
    getMessages(chatId: $chatId) {
      id
      text
      createdAt
      senderId
    }
  }
`;

export const CREATE_MESSAGE = gql`
  mutation CreateMessage($input: CreateMessageInput!) {
    createMessage(input: $input) {
      message_id
      chat_id
      sender_id
      text
      sent_at
      read_status
    }
  }
`;

export const UPDATE_MESSAGE = gql`
  mutation UpdateMessage($input: UpdateMessageInput!) {
    updateMessage(input: $input) {
      chat_id
      message_id
      sent_at
      read_status
    }
  }
`;

export const ON_NEW_MESSAGE = gql`
  subscription OnNewMessage($chat_id: ID, $chat_ids: [ID]) {
    onCreateMessage(chat_id: $chat_id, chat_ids: $chat_ids) {
      message_id
      chat_id
      sent_at
      sender_id
      text
      read_status
  }
}
`;
export const ON_UPDATE_MESSAGE = gql`
  subscription OnUpdateMessage($chat_ids: [ID]) {
    onUpdateMessage(chat_ids: $chat_ids) {
      message_id
      chat_id
      sent_at
      sender_id
      text
      read_status
  }
}
`;

export const LIST_MESSAGES = gql`
  query ListMessages(
    $filter: TableMessageFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listMessages(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        messageId: message_id
        chatId: chat_id
        text
        sentAt: sent_at
        senderId: sender_id
        readStatus: read_status
      }
      nextToken
    }
  }
`;