// src/services/RequestService.ts
import { Configuration } from "../generated";
import { getIdToken } from "./CognitoService";

// ================== API ENDPOINT CONSTANTS ==================
const REQUEST_API_BASE = process.env.EXPO_PUBLIC_REQUEST_API_BASE;
const CHAT_API_BASE = process.env.EXPO_PUBLIC_CHAT_API_BASE;
// ================== INTERFACES ==================
export interface AdoptionRequest {
  requestId: string;
  createdAt: string;
  adopterId: string;
  dogId: string;
  dogCreatedAt: string;
  shelterId: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  chatid?: string; // Optional, if chat is created
}

// ================== HELPERS ==================
const withAuthHeaders = async () => {
  const token = await getIdToken();
  if (!token) throw new Error("No token available");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// ================== FUNCTIONS ==================
export async function createAdoptionRequest(dogId: string, dogCreatedAt: string, shelterId: string): Promise<AdoptionRequest> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${REQUEST_API_BASE}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ dogId, dogCreatedAt, shelterId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create adoption request: ${await response.text()}`);
  }
  return response.json();
}

export async function getAdoptionRequests(): Promise<AdoptionRequest[]> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${REQUEST_API_BASE}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch adoption requests: ${await response.text()}`);
  }

  // Items are in DynamoDB wire format if you didn’t unmarshall in Lambda
  // If you DID unmarshall in Lambda, you can just return response.json()
  const data = await response.json();
  return data.map((item: any) => ({
    requestId: item.request_id.S,
    createdAt: item.created_at.S,
    adopterId: item.adopter_id.S,
    dogId: item.dog_id.S,
    dogCreatedAt: item.dog_created_at.S,
    shelterId: item.shelter_id.S,
    status: item.status.S,
  }));
}

export async function updateAdoptionRequestStatus(requestId: string, createdAt: string, status: AdoptionRequest["status"]): Promise<void> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${REQUEST_API_BASE}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ requestId, createdAt, status }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update request status: ${await response.text()}`);
  }
}

export async function deleteAdoptionRequest(requestId: string, createdAt: string): Promise<void> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${REQUEST_API_BASE}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ requestId, createdAt }),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete adoption request: ${await response.text()}`);
  }
}

export async function createChat(adopterId: string, dogId: string, dogCreatedAt: string): Promise<string> {
    const headers = await withAuthHeaders();
    const response = await fetch(`${CHAT_API_BASE}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ adopterId, dogId, dogCreatedAt }),
    });

    if (!response.ok) {
        throw new Error(`Failed to create chat: ${await response.text()}`);
    }

    const data = await response.json();
    return data.chatId;
}

export async function updateAdoptionRequestChatId(requestId: string, chatId: string): Promise<void> {
    const headers = await withAuthHeaders();
    const response = await fetch(`${REQUEST_API_BASE}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ requestId, chatId, action: 'updateChatId' }),
    });

    if (!response.ok) {
        throw new Error(`Failed to update request with chat ID: ${await response.text()}`);
    }
}
