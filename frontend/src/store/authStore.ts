import { create } from 'zustand';
import { User } from '../types';
import { authApi } from '../services/api';
import { initSocket, disconnectSocket } from '../socket/socketClient';
import { generateKeyBundle, getLocalKeyBundle } from '../encryption/e2eeService';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  initE2EE: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login({ email, password });
      const { user, accessToken, refreshToken } = data.data;

      // Normalize _id to id
      const normalizedUser = {
        ...user,
        id: user.id || user._id?.toString(),
      };

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userId', normalizedUser.id);

      set({
        user: normalizedUser,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      });

      initSocket(accessToken);

      if (!getLocalKeyBundle() && !user.hasKeyBundle) {
        await get().initE2EE();
      }
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.register({ username, email, password });
      const { user, accessToken, refreshToken } = data.data;

      // Normalize _id to id
      const normalizedUser = {
        ...user,
        id: user.id || user._id?.toString(),
      };

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userId', normalizedUser.id);

      set({
        user: normalizedUser,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      });

      initSocket(accessToken);
      await get().initE2EE();
    } finally {
      set({ isLoading: false });
    }
  },

  initE2EE: async () => {
    try {
      const { publicBundle } = await generateKeyBundle();
      await authApi.uploadKeyBundle({
        identityKey: publicBundle.identityKey,
        registrationId: publicBundle.registrationId,
        signedPreKey: publicBundle.signedPreKey,
        preKeys: publicBundle.preKeys,
      });
      console.log('🔐 E2EE keys generated and uploaded');
    } catch (err) {
      console.error('E2EE init failed:', err);
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    disconnectSocket();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  restoreSession: async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    set({ isLoading: true });
    try {
      const { data } = await authApi.getMe();
      const user = data.data.user;

      const normalizedUser = {
        ...user,
        id: user.id || user._id?.toString(),
      };

      set({ user: normalizedUser, accessToken, isAuthenticated: true });
      initSocket(accessToken);
    } catch {
      get().logout();
    } finally {
      set({ isLoading: false });
    }
  },
}));