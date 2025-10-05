// this basically reflects the database structure
export interface Dog {
  dogId: string; // PK: dogId
  name: string;
  breed: string;
  age: number; // Age in **years** (Number)
  gender: string; // e.g., "Male", "Female"
  description: string;
  photoURLs: string[]; // List of URLs, matching 'photoURLs' attribute
  shelterId: string; // Foreign Key: userId of the shelter
  status: 'Available' | 'Pending Adoption' | 'Adopted'; // Dog's adoption status
  createdAt: string; // ISO 8601 timestamp
}

export interface Chat {
  chatId: string; // PK: chatId
  dogId?: string; // Nullable
  shelterId: string; // userId of the shelter
  adopterId: string; // userId of the adopter
}

export interface Message {
  chatId: string; // PK: Links to Chat
  sentAt: string; // SK: ISO 8601 timestamp
  messageId: string; // Unique ID for the individual message
  senderId: string; // userId of the sender
  receiverId: string; // userId of the primary recipient
  content: string; // The message text
  read: boolean; // Read status
}

// **UPDATED** AdoptionRequest interface
// Matches the provided 'Requests' table schema.
export interface AdoptionRequest {
  requestId: string; // PK
  dogId: string;
  shelterId: string; // userId of the shelter receiving the request
  adopterId: string; // userId of the adopter who submitted the request
  status: 'Pending' | 'Approved' | 'Rejected'| 'Withdrawn'; // **Updated: 'Approved' instead of 'Confirmed'**
  createdAt: string; // When the request was submitted (matches DB)
  respondedAt?: string; // Nullable: When the shelter responded (matches DB)
  chatid?: string; // **Updated: 'chatid' (lowercase) and nullable**
  
  // Client-side denormalization: This is for display purposes.
  // Your API would ideally join the Dog data to the request before sending it to the frontend.
  dog_details: Dog;
}