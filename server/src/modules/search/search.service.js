import * as searchRepo from './search.repository.js';
import { formatPost } from '../posts/post.service.js';

const parsePagination = (page, limit) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (parsedPage - 1) * parsedLimit;
  return { page: parsedPage, limit: parsedLimit, offset };
};

const formatCommunity = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdBy: row.created_by,
  createdAt: row.created_at,
  memberCount: row.member_count !== undefined ? Number(row.member_count) : 0,
  isMember: Boolean(row.is_member),
});

const formatUser = (row) => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  bio: row.bio,
  karma: row.karma !== undefined ? Number(row.karma) : 0,
  createdAt: row.created_at,
});

export const search = async ({ q, type = 'all', userId = null, page, limit }) => {
  if (!q || typeof q !== 'string' || !q.trim()) {
    const error = new Error('Search query parameter "q" is required');
    error.status = 400;
    throw error;
  }

  const queryTerm = q.trim();
  const searchType = typeof type === 'string' ? type.toLowerCase().trim() : 'all';
  const { page: p, limit: l, offset } = parsePagination(page, limit);

  if (searchType === 'posts') {
    const { rows, total } = await searchRepo.searchPosts({
      q: queryTerm,
      viewerId: userId,
      limit: l,
      offset,
    });
    const totalPages = Math.ceil(total / l) || 1;
    return {
      query: queryTerm,
      posts: rows.map(formatPost),
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages,
        hasMore: p * l < total,
      },
    };
  }

  if (searchType === 'communities') {
    const { rows, total } = await searchRepo.searchCommunities({
      q: queryTerm,
      viewerId: userId,
      limit: l,
      offset,
    });
    const totalPages = Math.ceil(total / l) || 1;
    return {
      query: queryTerm,
      communities: rows.map(formatCommunity),
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages,
        hasMore: p * l < total,
      },
    };
  }

  if (searchType === 'users') {
    const { rows, total } = await searchRepo.searchUsers({
      q: queryTerm,
      limit: l,
      offset,
    });
    const totalPages = Math.ceil(total / l) || 1;
    return {
      query: queryTerm,
      users: rows.map(formatUser),
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages,
        hasMore: p * l < total,
      },
    };
  }

  // searchType === 'all'
  // Fetch top 5 matching items across posts, communities, users
  const [postsRes, commsRes, usersRes] = await Promise.all([
    searchRepo.searchPosts({ q: queryTerm, viewerId: userId, limit: 5, offset: 0 }),
    searchRepo.searchCommunities({ q: queryTerm, viewerId: userId, limit: 5, offset: 0 }),
    searchRepo.searchUsers({ q: queryTerm, limit: 5, offset: 0 }),
  ]);

  return {
    query: queryTerm,
    posts: postsRes.rows.map(formatPost),
    communities: commsRes.rows.map(formatCommunity),
    users: usersRes.rows.map(formatUser),
  };
};
