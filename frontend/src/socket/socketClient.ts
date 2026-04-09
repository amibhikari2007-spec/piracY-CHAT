import { io, Socket } from 'socket.io-client';
import {
  Message,
  MessageStatusEvent,
  TypingEvent,
  PresenceEvent,
} from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('🟢 Socket connected:', socket!.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔴 Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ── Typed event emitters ──────────────────────────────────────────────────────

export const socketEmit = {
  joinConversation: (conversationId: string) => {
    socket?.emit('conversation:join', conversationId);
  },
  leaveConversation: (conversationId: string) => {
    socket?.emit('conversation:leave', conversationId);
  },
  sendMessage: (payload: {
    conversationId: string;
    receiverId: string;
    encryptedPayload: { type: number; body: string; iv: string; registrationId?: number };
    sessionId: string;
    messageType?: string;
    tempId: string;
  }) => {
    socket?.emit('message:send', payload);
  },
  markSeen: (conversationId: string, senderId: string) => {
    socket?.emit('message:seen', { conversationId, senderId });
  },
  startTyping: (conversationId: string, receiverId: string) => {
    socket?.emit('typing:start', { conversationId, receiverId });
  },
  stopTyping: (conversationId: string, receiverId: string) => {
    socket?.emit('typing:stop', { conversationId, receiverId });
  },
  setActive: (conversationId: string) => {
    socket?.emit('presence:active', conversationId);
  },
  setIdle: () => {
    socket?.emit('presence:idle');
  },
};

// ── Typed event listeners ─────────────────────────────────────────────────────

export const socketOn = {
  messageReceive: (cb: (msg: Message) => void) => {
    socket?.on('message:receive', cb);
  },
  messageSent: (cb: (msg: Message & { tempId: string }) => void) => {
    socket?.on('message:sent', cb);
  },
  messageError: (cb: (err: { tempId: string; error: string }) => void) => {
    socket?.on('message:error', cb);
  },
  messageStatus: (cb: (event: MessageStatusEvent) => void) => {
    socket?.on('message:status', cb);
  },
  messageDelivered: (cb: (event: { messageId: string; conversationId: string }) => void) => {
    socket?.on('message:delivered', cb);
  },
  typingStart: (cb: (event: TypingEvent) => void) => {
    socket?.on('typing:start', cb);
  },
  typingStop: (cb: (event: { conversationId: string; userId: string }) => void) => {
    socket?.on('typing:stop', cb);
  },
  userOnline: (cb: (event: PresenceEvent) => void) => {
    socket?.on('user:online', cb);
  },
  userOffline: (cb: (event: PresenceEvent) => void) => {
    socket?.on('user:offline', cb);
  },
};

export const socketOff = {
  messageReceive: (cb?: (msg: Message) => void) => socket?.off('message:receive', cb),
  messageSent:    (cb?: (msg: Message & { tempId: string }) => void) => socket?.off('message:sent', cb),
  messageStatus:  (cb?: (e: MessageStatusEvent) => void) => socket?.off('message:status', cb),
  typingStart:    (cb?: (e: TypingEvent) => void) => socket?.off('typing:start', cb),
  typingStop:     (cb?: (e: { conversationId: string; userId: string }) => void) => socket?.off('typing:stop', cb),
  userOnline:     (cb?: (e: PresenceEvent) => void) => socket?.off('user:online', cb),
  userOffline:    (cb?: (e: PresenceEvent) => void) => socket?.off('user:offline', cb),
};
