import { Post, FeedPagination } from './post';
import { Community } from './community';
import { UserProfile } from './user';

export type SearchType = 'all' | 'posts' | 'communities' | 'users';

export interface SearchResultAll {
  query: string;
  posts: Post[];
  communities: Community[];
  users: UserProfile[];
}

export interface SearchPostsResult {
  query: string;
  posts: Post[];
  pagination: FeedPagination;
}

export interface SearchCommunitiesResult {
  query: string;
  communities: Community[];
  pagination: FeedPagination;
}

export interface SearchUsersResult {
  query: string;
  users: UserProfile[];
  pagination: FeedPagination;
}
