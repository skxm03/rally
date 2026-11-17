export interface CommentAuthor {
  id: number | null;
  username: string;
  displayName?: string | null;
}

export interface CommentNode {
  id: number;
  postId: number;
  authorId: number | null;
  parentCommentId: number | null;
  content: string;
  score: number;
  userVote: number; // 1, -1, or 0
  createdAt: string;
  updatedAt: string;
  author?: CommentAuthor;
  replies: CommentNode[];
}

export interface CreateCommentPayload {
  parentCommentId?: number | null;
  content: string;
}

export interface UpdateCommentPayload {
  content: string;
}

export interface CommentsTreeResponse {
  comments: CommentNode[];
}

export interface SingleCommentResponse {
  comment: CommentNode;
}

export interface CommentVoteResponse {
  message: string;
  voteValue: number; // 1, -1, or 0
  score: number;
}

export interface DeleteCommentResponse {
  message: string;
  isTombstone: boolean;
}
