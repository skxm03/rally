import { api } from './client';
import { UserProfile, UserProfileResponse, UpdateProfilePayload } from '../types/user';

export const userApi = {
  async getUserProfile(username: string): Promise<UserProfileResponse> {
    return api.get<UserProfileResponse>(`/users/${encodeURIComponent(username)}`);
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const res = await api.put<{ user: UserProfile }>('/users/profile', payload, {
      requiresAuth: true,
    });
    return res.user;
  },
};
