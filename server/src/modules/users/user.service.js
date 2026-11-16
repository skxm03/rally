import * as userRepo from './user.repository.js';
import { getPostsByAuthor } from '../posts/post.service.js';

export const formatUserProfile = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    karma: row.karma,
    createdAt: row.created_at,
  };
};

export const getUserProfile = async (username, currentUserId = null) => {
  if (!username) {
    const error = new Error('Username is required');
    error.status = 400;
    throw error;
  }

  const row = await userRepo.findProfileByUsername(username.trim());
  if (!row) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const posts = await getPostsByAuthor(row.id, currentUserId);

  return {
    user: formatUserProfile(row),
    posts,
    comments: [],
  };
};

export const updateUserProfile = async (userId, { displayName, bio }) => {
  if (displayName !== undefined && displayName !== null) {
    if (typeof displayName !== 'string' || displayName.trim().length > 100) {
      const error = new Error('Display name must not exceed 100 characters');
      error.status = 400;
      throw error;
    }
  }

  if (bio !== undefined && bio !== null) {
    if (typeof bio !== 'string' || bio.trim().length > 500) {
      const error = new Error('Bio must not exceed 500 characters');
      error.status = 400;
      throw error;
    }
  }

  const cleanDisplayName = displayName !== undefined ? (displayName?.trim() || null) : null;
  const cleanBio = bio !== undefined ? (bio?.trim() || null) : null;

  const row = await userRepo.updateUserProfile(userId, {
    displayName: cleanDisplayName,
    bio: cleanBio,
  });

  if (!row) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return { user: formatUserProfile(row) };
};
