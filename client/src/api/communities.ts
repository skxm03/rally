import { api } from './client';
import {
  Community,
  CommunitiesListResponse,
  CommunityDetailResponse,
  CreateCommunityPayload,
  CommunityPostsResponse,
  MembershipResponse,
} from '../types/community';
import { FeedSort } from '../types/post';

export const communityApi = {
  async getCommunities(): Promise<Community[]> {
    const res = await api.get<CommunitiesListResponse>('/communities');
    return res.communities;
  },

  async getCommunityByName(name: string): Promise<Community> {
    const res = await api.get<CommunityDetailResponse>(`/communities/${encodeURIComponent(name)}`);
    return res.community;
  },

  async createCommunity(payload: CreateCommunityPayload): Promise<Community> {
    const res = await api.post<CommunityDetailResponse>('/communities', payload, {
      requiresAuth: true,
    });
    return res.community;
  },

  async joinCommunity(id: number): Promise<MembershipResponse> {
    return api.post<MembershipResponse>(`/communities/${id}/join`, undefined, {
      requiresAuth: true,
    });
  },

  async leaveCommunity(id: number): Promise<MembershipResponse> {
    return api.post<MembershipResponse>(`/communities/${id}/leave`, undefined, {
      requiresAuth: true,
    });
  },

  async getCommunityPosts(
    name: string,
    params: { sort?: FeedSort; page?: number; limit?: number } = {}
  ): Promise<CommunityPostsResponse> {
    const searchParams = new URLSearchParams();
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString();
    const endpoint = `/communities/${encodeURIComponent(name)}/posts${qs ? `?${qs}` : ''}`;
    return api.get<CommunityPostsResponse>(endpoint);
  },
};
