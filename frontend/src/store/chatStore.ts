import { create } from 'zustand';
import { Conversation, Message, User } from '../types';
import { chatApi, authApi } from '../services/api';
import { socketEmit, socketOn, socketOff } from '../socket/socketClient';
import { useAuthStore } from './authStore';
import {
  establishSession,
  getSession,
  encryptMessage,
  decryptMessage,
} from '../encryption/e2eeService';

interface TypingState {
  [conversationId: string]: {
    userId: string;
    username: string;
    timeout?: ReturnType<typeof setTimeout>;
  } | null;
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Record<string, Message[]>;
  typing: TypingState;
  onlineUsers: Set<string>;
  isLoadingMessages: boolean;
  hasMoreMessages: Record<string, boolean>;
  currentPage: Record<string, number>;

  loadConversations: () => Promise<void>;
  openConversation: (user: User) => Promise<void>;
  loadMessages: (conversationId: string, page?: number) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  setOnline: (userId: string) => void;
  setOffline: (userId: string, lastSeen?: string) => void;
  setTyping: (conversationId: string, userId: string, username: string) => void;
  clearTyping: (conversationId: string) => void;
  updateMessageStatus: (conversationId: string, status: string, messageId?: string) => void;
  subscribeToSocket: () => void;
  unsubscribeFromSocket: () => void;
}

const decodeText = async (msg: Message, fallback = '[Encrypted message]'): Promise<string> => {
  try {
    if (!msg.encryptedPayload?.body) return fallback;
    if (msg.encryptedPayload.type === 0) {
      return decodeURIComponent(escape(atob(msg.encryptedPayload.body)));
    }
    const senderId =
      typeof msg.sender === 'object'
        ? (msg.sender as any).id || (msg.sender as any)._id
        : msg.sender;
    const session = getSession(senderId) || getSession(msg.conversationId);
    if (session && (msg.encryptedPayload as any).iv && (msg.encryptedPayload as any).iv !== 'none') {
      return await decryptMessage(session.sessionKey, {
        type: msg.encryptedPayload.type,
        body: msg.encryptedPayload.body,
        iv: (msg.encryptedPayload as any).iv,
      });
    }
  } catch {
    // silent
  }
  return fallback;
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: {},
  typing: {},
  onlineUsers: new Set(),
  isLoadingMessages: false,
  hasMoreMessages: {},
  currentPage: {},

  loadConversations: async () => {
    try {
      const { data } = await chatApi.getConversations();
      set({ conversations: data.data.conversations });
    } catch (err) {
      console.error('loadConversations error:', err);
    }
  },

  openConversation: async (otherUser: User) => {
    try {
      const currentUser = useAuthStore.getState().user;
      const targetId = otherUser.id || (otherUser as any)._id;
      if (!targetId) {
        console.error('otherUser has no id!', otherUser);
        return;
      }

      const { data } = await chatApi.getConversation(targetId);
      const conversation: Conversation = data.data.conversation;

      set({ activeConversation: conversation });
      socketEmit.joinConversation(conversation._id);
      socketEmit.setActive(conversation._id);

      await get().loadMessages(conversation._id);
      chatApi.markSeen(conversation._id).catch(() => {});

      const other = conversation.participants.find(
        (p) => p.id !== currentUser?.id && (p as any)._id !== currentUser?.id
      );
      if (other) {
        socketEmit.markSeen(conversation._id, other.id || (other as any)._id || '');
      }

      try {
        const existingSession = getSession(targetId);
        if (!existingSession) {
          const { data: keyData } = await authApi.getKeyBundle(targetId);
          if (keyData?.data) {
            await establishSession(keyData.data);
            console.log('🔐 E2EE session established with', otherUser.username);
          }
        }
      } catch (e) {
        console.warn('E2EE session skipped:', e);
      }
    } catch (err) {
      console.error('openConversation error:', err);
    }
  },

  loadMessages: async (conversationId, page = 1) => {
    set({ isLoadingMessages: true });
    try {
      const { data } = await chatApi.getMessages(conversationId, page);
      const { messages, pagination } = data.data;

      const decrypted = await Promise.all(
        messages.map(async (msg: Message) => ({
          ...msg,
          decryptedText: await decodeText(msg),
        }))
      );

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]:
            page === 1
              ? decrypted
              : [...decrypted, ...(state.messages[conversationId] || [])],
        },
        hasMoreMessages: {
          ...state.hasMoreMessages,
          [conversationId]: pagination.hasNext,
        },
        currentPage: { ...state.currentPage, [conversationId]: page },
      }));
    } catch (err) {
      console.error('loadMessages error:', err);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (text: string) => {
    const { activeConversation } = get();
    if (!activeConversation || !text.trim()) return;

    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    const otherParticipant = activeConversation.participants.find(
      (p) => p.id !== currentUser.id && (p as any)._id !== currentUser.id
    );
    if (!otherParticipant) {
      console.error('No other participant found');
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const receiverId = otherParticipant.id || (otherParticipant as any)._id;

    const optimisticMsg: Message = {
      _id: tempId,
      conversationId: activeConversation._id,
      sender: currentUser,
      receiver: receiverId,
      encryptedPayload: { type: 0, body: '' },
      sessionId: 'local',
      messageType: 'text',
      status: 'sent',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decryptedText: text,
      tempId,
      pending: true,
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [activeConversation._id]: [
          ...(state.messages[activeConversation._id] || []),
          optimisticMsg,
        ],
      },
    }));

    try {
      let encryptedPayload: { type: number; body: string; iv: string } = {
        type: 0,
        body: btoa(unescape(encodeURIComponent(text))),
        iv: 'none',
      };

      try {
        const session = getSession(receiverId);
        if (session) {
          const enc = await encryptMessage(session.sessionKey, text);
          encryptedPayload = enc;
        }
      } catch (encErr) {
        console.warn('Encryption fallback used:', encErr);
      }

      socketEmit.sendMessage({
        conversationId: activeConversation._id,
        receiverId,
        encryptedPayload,
        sessionId: 'local',
        messageType: 'text',
        tempId,
      });
    } catch (err) {
      set((state) => ({
        messages: {
          ...state.messages,
          [activeConversation._id]: (state.messages[activeConversation._id] || []).map(
            (m) => (m.tempId === tempId ? { ...m, failed: true, pending: false } : m)
          ),
        },
      }));
      console.error('sendMessage error:', err);
    }
  },

  setOnline: (userId) => {
    set((state) => ({ onlineUsers: new Set([...state.onlineUsers, userId]) }));
  },

  setOffline: (userId, lastSeen) => {
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      const updatedConversations = state.conversations.map((c) => ({
        ...c,
        participants: c.participants.map((p) =>
          p.id === userId ? { ...p, isOnline: false, lastSeen: lastSeen || p.lastSeen } : p
        ),
      }));
      return { onlineUsers: next, conversations: updatedConversations };
    });
  },

  setTyping: (conversationId, userId, username) => {
    set((state) => {
      const existing = state.typing[conversationId];
      if (existing?.timeout) clearTimeout(existing.timeout);
      const timeout = setTimeout(() => get().clearTyping(conversationId), 4000);
      return { typing: { ...state.typing, [conversationId]: { userId, username, timeout } } };
    });
  },

  clearTyping: (conversationId) => {
    set((state) => ({ typing: { ...state.typing, [conversationId]: null } }));
  },

  updateMessageStatus: (conversationId, status, messageId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          !messageId || m._id === messageId ? { ...m, status: status as any } : m
        ),
      },
    }));
  },

  subscribeToSocket: () => {
    socketOn.userOnline(({ userId }) => get().setOnline(userId));
    socketOn.userOffline(({ userId, lastSeen }) => get().setOffline(userId, lastSeen));
    socketOn.typingStart(({ conversationId, userId, username }) =>
      get().setTyping(conversationId, userId, username)
    );
    socketOn.typingStop(({ conversationId }) => get().clearTyping(conversationId));
    socketOn.messageStatus(({ conversationId, status, messageId }) => {
      if (conversationId) get().updateMessageStatus(conversationId, status, messageId);
    });

    socketOn.messageSent(async (msg) => {
      const decryptedText = await decodeText(msg, msg.decryptedText || '');
      set((state) => ({
        messages: {
          ...state.messages,
          [msg.conversationId]: (state.messages[msg.conversationId] || []).map((m) =>
            m.tempId === msg.tempId ? { ...msg, decryptedText, pending: false } : m
          ),
        },
      }));
    });

    socketOn.messageReceive(async (msg) => {
      const decryptedText = await decodeText(msg, '[Encrypted message]');
      set((state) => ({
        messages: {
          ...state.messages,
          [msg.conversationId]: [
            ...(state.messages[msg.conversationId] || []),
            { ...msg, decryptedText },
          ],
        },
      }));
      const { activeConversation } = get();
      if (activeConversation?._id === msg.conversationId) {
        const senderId =
          typeof msg.sender === 'object'
            ? (msg.sender as any).id || (msg.sender as any)._id
            : msg.sender;
        socketEmit.markSeen(msg.conversationId, senderId);
      }
    });
  },

  unsubscribeFromSocket: () => {
    socketOff.messageReceive();
    socketOff.messageSent();
    socketOff.messageStatus();
    socketOff.typingStart();
    socketOff.typingStop();
    socketOff.userOnline();
    socketOff.userOffline();
  },
}));
