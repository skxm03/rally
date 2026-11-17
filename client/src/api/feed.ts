import { api } from './client';
import { FeedResponse, FeedSort, FeedType } from '../types/post';

export interface FeedQueryParams {
  type?: FeedType;
  sort?: FeedSort;
  page?: number;
  limit?: number;
}

export const feedApi = {
  async getFeed(params: FeedQueryParams = {}): Promise<FeedResponse> {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.append('type', params.type);
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString();
    const endpoint = `/feed${qs ? `?${qs}` : ''}`;
    return api.get<FeedResponse>(endpoint);
  },

  async getPopularFeed(params: Omit<FeedQueryParams, 'type'> = {}): Promise<FeedResponse> {
    const searchParams = new URLSearchParams();
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString();
    const endpoint = `/feed/popular${qs ? `?${qs}` : ''}`;
    return api.get<FeedResponse>(endpoint);
  },
};
