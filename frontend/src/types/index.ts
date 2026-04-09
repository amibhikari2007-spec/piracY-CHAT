// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  _id?: string;  
  username: string;
  email: string;
  avatar?: string | null;
  isOnline: boolean;
  lastSeen: string;
  hasKeyBundle: boolean;
}

// ── E2EE Key Types ────────────────────────────────────────────────────────────
export interface KeyBundle {
  identityKey: string;
  registrationId: number;
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  preKey?: {
    keyId: number;
    publicKey: string;
  } | null;
}

export interface LocalKeyStore {
  identityKeyPair: { pubKey: string; privKey: string };
  registrationId: number;
  signedPreKeyPair: { keyId: number; pubKey: string; privKey: string; signature: string };
  preKeyPairs: Array<{ keyId: number; pubKey: string; privKey: string }>;
}

// ── Messages ──────────────────────────────────────────────────────────────────
export type MessageStatus = 'sent' | 'delivered' | 'seen';
export type MessageType   = 'text' | 'image' | 'video' | 'audio' | 'file';

export interface EncryptedPayload {
  type: number;
  body: string;
  registrationId?: number;
}

export interface MediaAttachment {
  url: string;
  encryptedKey: string;
  iv: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  thumbnailUrl?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  sender: User | string;
  receiver: string;
  encryptedPayload: EncryptedPayload;
  sessionId: string;
  messageType: MessageType;
  media?: MediaAttachment;
  status: MessageStatus;
  sentAt: string;
  deliveredAt?: string;
  seenAt?: string;
  createdAt: string;
  updatedAt: string;
  // Client-only: decrypted text (never persisted)
  decryptedText?: string;
  // Optimistic UI
  tempId?: string;
  pending?: boolean;
  failed?: boolean;
}

// ── Conversations ─────────────────────────────────────────────────────────────
export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadCount: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

// ── Socket Events ─────────────────────────────────────────────────────────────
export interface TypingEvent {
  conversationId: string;
  userId: string;
  username: string;
}

export interface MessageStatusEvent {
  conversationId?: string;
  messageId?: string;
  status: MessageStatus;
  seenBy?: string;
}

export interface PresenceEvent {
  userId: string;
  lastSeen?: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
