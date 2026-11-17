import { api } from './client';
import {
  CommentNode,
  CommentsTreeResponse,
  SingleCommentResponse,
  CreateCommentPayload,
  UpdateCommentPayload,
  CommentVoteResponse,
  DeleteCommentResponse,
} from '../types/comment';

export const commentApi = {
  async getComments(postId: number): Promise<CommentNode[]> {
    const res = await api.get<CommentsTreeResponse>(`/posts/${postId}/comments`);
    return res.comments;
  },

  async createComment(postId: number, payload: CreateCommentPayload): Promise<CommentNode> {
    const res = await api.post<SingleCommentResponse>(`/posts/${postId}/comments`, payload, {
      requiresAuth: true,
    });
    return res.comment;
  },

  async updateComment(commentId: number, payload: UpdateCommentPayload): Promise<CommentNode> {
    const res = await api.put<SingleCommentResponse>(`/comments/${commentId}`, payload, {
      requiresAuth: true,
    });
    return res.comment;
  },

  async deleteComment(commentId: number): Promise<DeleteCommentResponse> {
    return api.delete<DeleteCommentResponse>(`/comments/${commentId}`, { requiresAuth: true });
  },

  async voteComment(commentId: number, voteValue: 1 | -1): Promise<CommentVoteResponse> {
    return api.post<CommentVoteResponse>(`/comments/${commentId}/vote`, { voteValue }, {
      requiresAuth: true,
    });
  },
};
