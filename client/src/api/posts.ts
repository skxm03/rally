import { Platform } from 'react-native';
import { ImagePickerAsset } from 'expo-image-picker';
import { api } from './client';
import {
  Post,
  PostResponse,
  CreatePostPayload,
  UpdatePostPayload,
  VoteResponse,
} from '../types/post';

export const postApi = {
  async getPost(postId: number): Promise<Post> {
    const res = await api.get<PostResponse>(`/posts/${postId}`);
    return res.post;
  },

  async votePost(postId: number, voteValue: 1 | -1): Promise<VoteResponse> {
    return api.post<VoteResponse>(`/posts/${postId}/vote`, { voteValue }, { requiresAuth: true });
  },

  async createPost(payload: CreatePostPayload): Promise<Post> {
    const res = await api.post<PostResponse>('/posts', payload, { requiresAuth: true });
    return res.post;
  },

  async updatePost(postId: number, payload: UpdatePostPayload): Promise<Post> {
    const res = await api.put<PostResponse>(`/posts/${postId}`, payload, { requiresAuth: true });
    return res.post;
  },

  async deletePost(postId: number): Promise<void> {
    await api.delete(`/posts/${postId}`, { requiresAuth: true });
  },

  async uploadImage(asset: ImagePickerAsset): Promise<string> {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileName = asset.fileName || 'upload.jpg';
      formData.append('image', blob, fileName);
    } else {
      formData.append('image', {
        uri: asset.uri,
        name: asset.fileName || 'upload.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);
    }

    const result = await api.post<{ imageUrl: string }>('/upload', formData, {
      requiresAuth: true,
    });
    return result.imageUrl;
  },
};
