import * as commentRepo from './comment.repository.js';
import { findPostById, isCommunityMember } from '../posts/post.repository.js';

export const formatComment = (row) => {
  if (!row) return null;
  const isDeleted = row.content === '[deleted]';

  return {
    id: row.id,
    postId: row.post_id,
    authorId: isDeleted ? null : row.author_id,
    parentCommentId: row.parent_comment_id || null,
    content: row.content,
    score: row.score !== undefined ? Number(row.score) : 0,
    userVote: row.user_vote !== undefined ? Number(row.user_vote) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: isDeleted
      ? {
          id: null,
          username: '[deleted]',
          displayName: '[deleted]',
        }
      : row.author_username
      ? {
          id: row.author_id,
          username: row.author_username,
          displayName: row.author_display_name,
        }
      : undefined,
  };
};

export const buildCommentTree = (rows) => {
  const commentMap = new Map();
  const roots = [];

  rows.forEach((row) => {
    const formatted = {
      ...formatComment(row),
      replies: [],
    };
    commentMap.set(formatted.id, formatted);
  });

  rows.forEach((row) => {
    const comment = commentMap.get(row.id);
    if (row.parent_comment_id && commentMap.has(row.parent_comment_id)) {
      commentMap.get(row.parent_comment_id).replies.push(comment);
    } else {
      roots.push(comment);
    }
  });

  return roots;
};

export const createComment = async ({ postId, authorId, parentCommentId, content }) => {
  const numericPostId = parseInt(postId, 10);
  if (Number.isNaN(numericPostId) || numericPostId <= 0) {
    const error = new Error('Valid post ID is required');
    error.status = 400;
    throw error;
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 2000) {
    const error = new Error('Comment content must be between 1 and 2000 characters');
    error.status = 400;
    throw error;
  }

  const post = await findPostById(numericPostId);
  if (!post) {
    const error = new Error('Post not found');
    error.status = 404;
    throw error;
  }

  const isMember = await isCommunityMember(post.community_id, authorId);
  if (!isMember) {
    const error = new Error('You must join this community to comment');
    error.status = 403;
    throw error;
  }

  let validParentId = null;
  if (parentCommentId !== undefined && parentCommentId !== null) {
    const numericParentId = parseInt(parentCommentId, 10);
    if (Number.isNaN(numericParentId) || numericParentId <= 0) {
      const error = new Error('Invalid parent comment ID');
      error.status = 400;
      throw error;
    }

    const parent = await commentRepo.findCommentById(numericParentId);
    if (!parent) {
      const error = new Error('Parent comment not found');
      error.status = 404;
      throw error;
    }

    if (parent.post_id !== numericPostId) {
      const error = new Error('Parent comment belongs to a different post');
      error.status = 400;
      throw error;
    }

    validParentId = numericParentId;
  }

  const row = await commentRepo.createComment({
    postId: numericPostId,
    authorId,
    parentCommentId: validParentId,
    content: content.trim(),
  });

  // Fetch full row with author username
  const fullRow = await commentRepo.findCommentById(row.id, authorId);
  return { comment: formatComment(fullRow) };
};

export const getCommentsTree = async (postId, currentUserId = null) => {
  const numericPostId = parseInt(postId, 10);
  if (Number.isNaN(numericPostId) || numericPostId <= 0) {
    const error = new Error('Valid post ID is required');
    error.status = 400;
    throw error;
  }

  const post = await findPostById(numericPostId);
  if (!post) {
    const error = new Error('Post not found');
    error.status = 404;
    throw error;
  }

  const rows = await commentRepo.findCommentsByPostId(numericPostId, currentUserId);
  const comments = buildCommentTree(rows);

  return { comments };
};

export const updateComment = async (commentId, userId, { content }) => {
  const numericId = parseInt(commentId, 10);
  if (Number.isNaN(numericId) || numericId <= 0) {
    const error = new Error('Valid comment ID is required');
    error.status = 400;
    throw error;
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 2000) {
    const error = new Error('Comment content must be between 1 and 2000 characters');
    error.status = 400;
    throw error;
  }

  const comment = await commentRepo.findCommentById(numericId, userId);
  if (!comment) {
    const error = new Error('Comment not found');
    error.status = 404;
    throw error;
  }

  if (comment.author_id !== userId) {
    const error = new Error('You are not authorized to edit this comment');
    error.status = 403;
    throw error;
  }

  if (comment.content === '[deleted]') {
    const error = new Error('Cannot edit a deleted comment');
    error.status = 400;
    throw error;
  }

  const row = await commentRepo.updateComment(numericId, { content: content.trim() });
  const fullRow = await commentRepo.findCommentById(row.id, userId);
  return { comment: formatComment(fullRow) };
};

export const deleteComment = async (commentId, userId) => {
  const numericId = parseInt(commentId, 10);
  if (Number.isNaN(numericId) || numericId <= 0) {
    const error = new Error('Valid comment ID is required');
    error.status = 400;
    throw error;
  }

  const comment = await commentRepo.findCommentById(numericId, userId);
  if (!comment) {
    const error = new Error('Comment not found');
    error.status = 404;
    throw error;
  }

  if (comment.author_id !== userId) {
    const error = new Error('You are not authorized to delete this comment');
    error.status = 403;
    throw error;
  }

  const hasChildren = await commentRepo.hasChildReplies(numericId);
  if (hasChildren) {
    await commentRepo.tombstoneComment(numericId);
    return { message: 'Comment deleted successfully', isTombstone: true };
  }

  await commentRepo.deleteComment(numericId);
  return { message: 'Comment deleted successfully', isTombstone: false };
};

export const voteComment = async (commentId, userId, voteValue) => {
  const numericId = parseInt(commentId, 10);
  if (Number.isNaN(numericId) || numericId <= 0) {
    const error = new Error('Valid comment ID is required');
    error.status = 400;
    throw error;
  }

  const numericVote = Number(voteValue);
  if (numericVote !== 1 && numericVote !== -1) {
    const error = new Error('Vote value must be 1 or -1');
    error.status = 400;
    throw error;
  }

  const result = await commentRepo.handleCommentVote({
    commentId: numericId,
    userId,
    voteValue: numericVote,
  });

  if (!result) {
    const error = new Error('Comment not found');
    error.status = 404;
    throw error;
  }

  let message = 'Vote recorded';
  if (result.finalVote === 0) {
    message = 'Vote removed';
  }

  return {
    message,
    voteValue: result.finalVote,
    score: result.newScore,
  };
};

export const getCommentsByAuthor = async (authorId) => {
  const rows = await commentRepo.findCommentsByAuthor(authorId);
  return rows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    content: row.content,
    score: Number(row.score) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    post: {
      id: row.post_id,
      title: row.post_title,
    },
    community: {
      id: row.community_id,
      name: row.community_name,
    },
  }));
};
