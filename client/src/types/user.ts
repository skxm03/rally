import { Post } from './post';

export interface UserProfile {
  id: number;
  username: string;
  displayName: string | null;
  bio: string | null;
  karma: number;
  createdAt: string;
}

export interface UserProfileResponse {
  user: UserProfile;
  posts: Post[];
  comments: any[];
}

export interface UpdateProfilePayload {
  displayName?: string | null;
  bio?: string | null;
}
