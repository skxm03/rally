import { api } from './client';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/register', payload);
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/login', payload);
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network failures on logout
    }
  },

  async getMe(): Promise<User> {
    const res = await api.get<{ user: User }>('/auth/me', { requiresAuth: true });
    return res.user;
  },
};
