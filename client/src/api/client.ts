import axios from 'axios';
import type {
  AuthResponse,
  User,
  Room,
  RoomDetail,
  Message,
  PaginatedMessages,
  Participant,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: async (nickname: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', { nickname });
    return data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
};

// Rooms API
export const roomsApi = {
  getAll: async (): Promise<Room[]> => {
    const { data } = await api.get<Room[]>('/rooms');
    return data;
  },

  getById: async (id: string): Promise<RoomDetail> => {
    const { data } = await api.get<RoomDetail>(`/rooms/${id}`);
    return data;
  },

  create: async (name: string): Promise<Room> => {
    const { data } = await api.post<Room>('/rooms', { name });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/rooms/${id}`);
  },

  join: async (id: string): Promise<void> => {
    await api.post(`/rooms/${id}/join`);
  },

  leave: async (id: string): Promise<void> => {
    await api.post(`/rooms/${id}/leave`);
  },

  getParticipants: async (id: string): Promise<Participant[]> => {
    const { data } = await api.get<Participant[]>(`/rooms/${id}/participants`);
    return data;
  },
};

// Messages API
export const messagesApi = {
  getByRoom: async (
    roomId: string,
    cursor?: string,
    limit?: number
  ): Promise<PaginatedMessages> => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', limit.toString());

    const { data } = await api.get<PaginatedMessages>(
      `/rooms/${roomId}/messages?${params.toString()}`
    );
    return data;
  },

  send: async (roomId: string, content: string): Promise<Message> => {
    const { data } = await api.post<Message>(`/rooms/${roomId}/messages`, {
      content,
    });
    return data;
  },

  edit: async (
    roomId: string,
    messageId: string,
    content: string
  ): Promise<Message> => {
    const { data } = await api.patch<Message>(
      `/rooms/${roomId}/messages/${messageId}`,
      { content }
    );
    return data;
  },

  delete: async (roomId: string, messageId: string): Promise<void> => {
    await api.delete(`/rooms/${roomId}/messages/${messageId}`);
  },
};

export default api;
