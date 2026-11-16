import * as commRepo from './community.repository.js';

export const formatCommunity = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    memberCount: row.member_count !== undefined ? Number(row.member_count) : 0,
    isMember: Boolean(row.is_member),
    createdAt: row.created_at,
  };
};

export const createCommunity = async ({ name, description, createdBy }) => {
  if (!name || typeof name !== 'string') {
    const error = new Error('Community name is required');
    error.status = 400;
    throw error;
  }

  const cleanName = name.trim().toLowerCase();
  const nameRegex = /^[a-z0-9_]{3,30}$/;
  if (!nameRegex.test(cleanName)) {
    const error = new Error(
      'Community name must be 3-30 alphanumeric characters or underscores'
    );
    error.status = 400;
    throw error;
  }

  if (description && (typeof description !== 'string' || description.trim().length > 1000)) {
    const error = new Error('Description must not exceed 1000 characters');
    error.status = 400;
    throw error;
  }

  const existing = await commRepo.findCommunityByNameOnly(cleanName);
  if (existing) {
    const error = new Error('Community name is already taken');
    error.status = 409;
    throw error;
  }

  const cleanDescription = description?.trim() || null;
  const row = await commRepo.createCommunityWithCreator({
    name: cleanName,
    description: cleanDescription,
    createdBy,
  });

  return {
    community: {
      id: row.id,
      name: row.name,
      description: row.description,
      createdBy: row.created_by,
      memberCount: 1,
      isMember: true,
      createdAt: row.created_at,
    },
  };
};

export const getCommunities = async (currentUserId = null) => {
  const rows = await commRepo.listCommunities(currentUserId);
  return {
    communities: rows.map(formatCommunity),
  };
};

export const getCommunityByName = async (name, currentUserId = null) => {
  if (!name) {
    const error = new Error('Community name is required');
    error.status = 400;
    throw error;
  }

  const row = await commRepo.findCommunityByName(name.trim(), currentUserId);
  if (!row) {
    const error = new Error('Community not found');
    error.status = 404;
    throw error;
  }

  return {
    community: formatCommunity(row),
  };
};

export const joinCommunity = async (communityId, userId) => {
  const numericId = parseInt(communityId, 10);
  if (Number.isNaN(numericId) || numericId <= 0) {
    const error = new Error('Invalid community ID');
    error.status = 400;
    throw error;
  }

  const community = await commRepo.findCommunityById(numericId);
  if (!community) {
    const error = new Error('Community not found');
    error.status = 404;
    throw error;
  }

  await commRepo.joinCommunity(numericId, userId);
  return {
    message: 'Joined community successfully',
    isMember: true,
  };
};

export const leaveCommunity = async (communityId, userId) => {
  const numericId = parseInt(communityId, 10);
  if (Number.isNaN(numericId) || numericId <= 0) {
    const error = new Error('Invalid community ID');
    error.status = 400;
    throw error;
  }

  const community = await commRepo.findCommunityById(numericId);
  if (!community) {
    const error = new Error('Community not found');
    error.status = 404;
    throw error;
  }

  if (community.created_by === userId) {
    const error = new Error(
      'Community creator cannot leave the community. You must delete the community first.'
    );
    error.status = 400;
    throw error;
  }

  await commRepo.leaveCommunity(numericId, userId);
  return {
    message: 'Left community successfully',
    isMember: false,
  };
};
