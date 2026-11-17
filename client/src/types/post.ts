export interface PostAuthor {
  id: number;
  username: string;
  displayName?: string | null;
}

export interface PostCommunity {
  id: number;
  name: string;
}

export interface Post {
  id: number;
  communityId: number;
  authorId: number;
  title: string;
  content: string | null;
  imageUrl: string | null;
  score: number;
  userVote: number; // 1, -1, or 0
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
  author?: PostAuthor;
  community?: PostCommunity;
}

export interface CreatePostPayload {
  communityId: number;
  title: string;
  content?: string | null;
  imageUrl?: string | null;
}

export interface UpdatePostPayload {
  title: string;
  content?: string | null;
  imageUrl?: string | null;
}

export interface PostResponse {
  post: Post;
}

export interface FeedPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface FeedResponse {
  posts: Post[];
  pagination: FeedPagination;
}

export type FeedType = 'home' | 'popular';
export type FeedSort = 'new' | 'top' | 'trending';

export interface VoteResponse {
  message: string;
  voteValue: number; // 1, -1, or 0
  score: number;
}
