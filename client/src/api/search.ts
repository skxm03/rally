import { api } from './client';
import {
  SearchType,
  SearchResultAll,
  SearchPostsResult,
  SearchCommunitiesResult,
  SearchUsersResult,
} from '../types/search';

export const searchApi = {
  async searchAll(q: string): Promise<SearchResultAll> {
    const searchParams = new URLSearchParams({ q, type: 'all' });
    return api.get<SearchResultAll>(`/search?${searchParams.toString()}`);
  },

  async searchPosts(q: string, page = 1, limit = 15): Promise<SearchPostsResult> {
    const searchParams = new URLSearchParams({ q, type: 'posts', page: String(page), limit: String(limit) });
    return api.get<SearchPostsResult>(`/search?${searchParams.toString()}`);
  },

  async searchCommunities(q: string, page = 1, limit = 15): Promise<SearchCommunitiesResult> {
    const searchParams = new URLSearchParams({ q, type: 'communities', page: String(page), limit: String(limit) });
    return api.get<SearchCommunitiesResult>(`/search?${searchParams.toString()}`);
  },

  async searchUsers(q: string, page = 1, limit = 15): Promise<SearchUsersResult> {
    const searchParams = new URLSearchParams({ q, type: 'users', page: String(page), limit: String(limit) });
    return api.get<SearchUsersResult>(`/search?${searchParams.toString()}`);
  },
};
