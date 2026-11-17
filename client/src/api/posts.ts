import { api } from './client';
import { Post, VoteResponse } from '../types/post';

export const postApi = {
  async getPost(postId: number): Promise<Post> {
    return api.get<Post>(`/posts/${postId}`);
  },

  async votePost(postId: number, voteValue: 1 | -1): Promise<VoteResponse> {
    return api.post<VoteResponse>(`/posts/${postId}/vote`, { voteValue }, { requiresAuth: true });
  },
};
