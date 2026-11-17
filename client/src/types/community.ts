import { FeedPagination, Post } from './post';

export interface Community {
  id: number;
  name: string;
  description: string | null;
  createdBy: number;
  memberCount: number;
  isMember: boolean;
  createdAt: string;
}

export interface CreateCommunityPayload {
  name: string;
  description?: string;
}

export interface CommunityDetailResponse {
  community: Community;
}

export interface CommunitiesListResponse {
  communities: Community[];
}

export interface CommunityPostsResponse {
  posts: Post[];
  pagination: FeedPagination;
}

export interface MembershipResponse {
  message: string;
  isMember: boolean;
}
