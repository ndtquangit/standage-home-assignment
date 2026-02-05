// User types
export interface User {
  id: string;
  nickname: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// Room types
export interface Room {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
  participantCount?: number;
}

export interface RoomDetail extends Room {
  participants: Participant[];
}

export interface Participant {
  id: string;
  userId: string;
  nickname: string;
  isOnline: boolean;
  joinedAt: string;
}

// Message types
export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderNickname: string;
  roomId: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMessages {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

// WebSocket event payloads
export interface UserPresencePayload {
  userId: string;
  nickname: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export interface RoomUserPayload {
  roomId: string;
  userId: string;
  nickname: string;
}

export interface TypingPayload {
  roomId: string;
  userId: string;
  nickname: string;
}

export interface MessageDeletedPayload {
  messageId: string;
  roomId: string;
}

export interface ReadyPayload {
  userId: string;
  nickname: string;
}
