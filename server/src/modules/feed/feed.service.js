import * as feedRepo from './feed.repository.js';
import { formatPost } from '../posts/post.service.js';
import { findCommunityByName } from '../communities/community.repository.js';

const parsePagination = (page, limit) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (parsedPage - 1) * parsedLimit;
  return { page: parsedPage, limit: parsedLimit, offset };
};

const normalizeSort = (sort) => {
  const s = typeof sort === 'string' ? sort.toLowerCase().trim() : 'new';
  if (['trending', 'hot', 'top', 'new'].includes(s)) {
    return s;
  }
  return 'new';
};

export const getHomeFeed = async ({ userId = null, sort, page, limit }) => {
  const { page: p, limit: l, offset } = parsePagination(page, limit);
  const normalizedSort = normalizeSort(sort);

  let type = 'popular';
  if (userId) {
    const joinedCount = await feedRepo.getUserJoinedCommunityCount(userId);
    if (joinedCount > 0) {
      type = 'home';
    }
  }

  const { rows, total } = await feedRepo.getFeedPosts({
    userId,
    type,
    sort: normalizedSort,
    limit: l,
    offset,
  });

  const totalPages = Math.ceil(total / l) || 1;
  const hasMore = p * l < total;

  return {
    posts: rows.map(formatPost),
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages,
      hasMore,
    },
  };
};

export const getPopularFeed = async ({ userId = null, sort, page, limit }) => {
  const { page: p, limit: l, offset } = parsePagination(page, limit);
  const normalizedSort = normalizeSort(sort);

  const { rows, total } = await feedRepo.getFeedPosts({
    userId,
    type: 'popular',
    sort: normalizedSort,
    limit: l,
    offset,
  });

  const totalPages = Math.ceil(total / l) || 1;
  const hasMore = p * l < total;

  return {
    posts: rows.map(formatPost),
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages,
      hasMore,
    },
  };
};

export const getCommunityPosts = async ({ communityName, userId = null, sort, page, limit }) => {
  if (!communityName || typeof communityName !== 'string' || !communityName.trim()) {
    const error = new Error('Community name is required');
    error.status = 400;
    throw error;
  }

  const community = await findCommunityByName(communityName.trim(), userId);
  if (!community) {
    const error = new Error('Community not found');
    error.status = 404;
    throw error;
  }

  const { page: p, limit: l, offset } = parsePagination(page, limit);
  const normalizedSort = normalizeSort(sort);

  const { rows, total } = await feedRepo.getFeedPosts({
    userId,
    communityId: community.id,
    sort: normalizedSort,
    limit: l,
    offset,
  });

  const totalPages = Math.ceil(total / l) || 1;
  const hasMore = p * l < total;

  return {
    posts: rows.map(formatPost),
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages,
      hasMore,
    },
  };
};
