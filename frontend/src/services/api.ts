import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true,
});

// ── Request Interceptor: attach access token ──────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: refresh token on 401 ────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        processQueue(new Error('No refresh token'), null);
        isRefreshing = false;
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });
        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ── Auth endpoints ────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  uploadKeyBundle: (bundle: object) => api.post('/auth/keys', bundle),
  getKeyBundle: (userId: string) => api.get(`/auth/keys/${userId}`),
};

// ── Chat endpoints ────────────────────────────────────────────────────────────
export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  getConversation: (userId: string) => api.get(`/chat/conversations/${userId}`),
  getMessages: (conversationId: string, page = 1) =>
    api.get(`/chat/messages/${conversationId}?page=${page}&limit=30`),
  markSeen: (conversationId: string) =>
    api.patch(`/chat/messages/${conversationId}/seen`),
  searchUsers: (q: string) => api.get(`/chat/users/search?q=${q}`),
  uploadMedia: (formData: FormData) =>
    api.post('/chat/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
