import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as postRepo from './post.repository.js';
import { findCommunityById } from '../communities/community.repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../../uploads');

export const formatPost = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    communityId: row.community_id,
    authorId: row.author_id,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url,
    score: row.score !== undefined ? Number(row.score) : 0,
    userVote: row.user_vote !== undefined ? Number(row.user_vote) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: row.author_username
      ? {
          id: row.author_id,
          username: row.author_username,
          displayName: row.author_display_name,
        }
      : undefined,
    community: row.community_name
      ? {
          id: row.community_id,
          name: row.community_name,
        }
      : undefined,
  };
};

export const createPost = async ({ communityId, authorId, title, content, imageUrl }) => {
  const numericCommunityId = parseInt(communityId, 10);
  if (Number.isNaN(numericCommunityId) || numericCommunityId <= 0) {
    const error = new Error('Valid community ID is required');
    error.status = 400;
    throw error;
  }

  if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 300) {
    const error = new Error('Title must be between 3 and 300 characters');
    error.status = 400;
    throw error;
  }

  const cleanContent = content && typeof content === 'string' && content.trim().length > 0
    ? content.trim()
    : null;
  const cleanImageUrl = imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0
    ? imageUrl.trim()
    : null;

  if (!cleanContent && !cleanImageUrl) {
    const error = new Error('Post must have either text content or an image');
    error.status = 400;
    throw error;
  }

  const community = await findCommunityById(numericCommunityId);
  if (!community) {
    const error = new Error('Community not found');
    error.status = 404;
    throw error;
  }

  const isMember = await postRepo.isCommunityMember(numericCommunityId, authorId);
  if (!isMember) {
    const error = new Error('You must join this community to post');
    error.status = 403;
    throw error;
  }

  const row = await postRepo.createPost({
    communityId: numericCommunityId,
    authorId,
    title: title.trim(),
    content: cleanContent,
    imageUrl: cleanImageUrl,
  });

  return { post: formatPost(row) };
};

export const getPostById = async (postId, currentUserId = null) => {
  const numericId = parseInt(postId, 10);
  if (Number.isNaN(numericId) || numericId <= 0) {
    const error = new Error('Invalid post ID');
    error.status = 400;
    throw error;
  }

  const row = await postRepo.findPostById(numericId, currentUserId);
  if (!row) {
    const error = new Error('Post not found');
    error.status = 404;
    throw error;
  }

  return { post: formatPost(row) };
};

export const updatePost = async (postId, userId, { title, content, imageUrl }) => {
  const numericId = parseInt(postId, 10);
  if (Number.isNaN(numericId) || numericId <= 0) {
    const error = new Error('Invalid post ID');
    error.status = 400;
    throw error;
  }

  const post = await postRepo.findPostById(numericId, userId);
  if (!post) {
    const error = new Error('Post not found');
    error.status = 404;
    throw error;
  }

  if (post.author_id !== userId) {
    const error = new Error('You are not authorized to edit this post');
    error.status = 403;
    throw error;
  }

  let cleanTitle = post.title;
  if (title !== undefined) {
    if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 300) {
      const error = new Error('Title must be between 3 and 300 characters');
      error.status = 400;
      throw error;
    }
    cleanTitle = title.trim();
  }

  const cleanContent = content !== undefined
    ? (typeof content === 'string' && content.trim().length > 0 ? content.trim() : null)
    : post.content;

  let cleanImageUrl = post.image_url;
  if (imageUrl !== undefined) {
    cleanImageUrl = imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0
      ? imageUrl.trim()
      : null;
    if (post.image_url && post.image_url !== cleanImageUrl && post.image_url.startsWith('/uploads/')) {
      try {
        const oldFilename = path.basename(post.image_url);
        await fs.promises.unlink(path.join(uploadsDir, oldFilename));
      } catch {
        // Ignore if old file missing
      }
    }
  }

  const row = await postRepo.updatePost(numericId, {
    title: cleanTitle,
    content: cleanContent,
    imageUrl: cleanImageUrl,
  });

  return { post: formatPost(row) };
};

export const deletePost = async (postId, userId) => {
  const numericId = parseInt(postId, 10);
  if (Number.isNaN(numericId) || numericId <= 0) {
    const error = new Error('Invalid post ID');
    error.status = 400;
    throw error;
  }

  const post = await postRepo.findPostById(numericId, userId);
  if (!post) {
    const error = new Error('Post not found');
    error.status = 404;
    throw error;
  }

  if (post.author_id !== userId) {
    const error = new Error('You are not authorized to delete this post');
    error.status = 403;
    throw error;
  }

  await postRepo.deletePost(numericId);

  // Unlink associated image file from disk to prevent orphaned files
  if (post.image_url && typeof post.image_url === 'string' && post.image_url.startsWith('/uploads/')) {
    try {
      const filename = path.basename(post.image_url);
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.unlink(filePath);
    } catch {
      // Ignore if file missing or already deleted
    }
  }

  return { message: 'Post deleted successfully' };
};

export const votePost = async (postId, userId, voteValue) => {
  const numericId = parseInt(postId, 10);
  if (Number.isNaN(numericId) || numericId <= 0) {
    const error = new Error('Invalid post ID');
    error.status = 400;
    throw error;
  }

  const numericVote = Number(voteValue);
  if (numericVote !== 1 && numericVote !== -1) {
    const error = new Error('Vote value must be 1 or -1');
    error.status = 400;
    throw error;
  }

  const result = await postRepo.handleVote({
    postId: numericId,
    userId,
    voteValue: numericVote,
  });

  if (!result) {
    const error = new Error('Post not found');
    error.status = 404;
    throw error;
  }

  let message = 'Vote recorded';
  if (result.finalVote === 0) {
    message = 'Vote removed';
  } else if (result.finalVote === numericVote) {
    message = 'Vote recorded';
  }

  return {
    message,
    voteValue: result.finalVote,
    score: result.newScore,
  };
};

export const getPostsByAuthor = async (authorId, currentUserId = null) => {
  const rows = await postRepo.findPostsByAuthor(authorId, currentUserId);
  return rows.map(formatPost);
};

export const getPostsByCommunity = async (communityId, currentUserId = null) => {
  const rows = await postRepo.findPostsByCommunity(communityId, currentUserId);
  return rows.map(formatPost);
};
