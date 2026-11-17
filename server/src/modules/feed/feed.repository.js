import { query } from '../../config/db.js';

export const getUserJoinedCommunityCount = async (userId) => {
  if (!userId) return 0;
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM community_members WHERE user_id = $1',
    [userId]
  );
  return result.rows[0]?.count || 0;
};

export const getFeedPosts = async ({
  userId = null,
  type = 'popular',
  communityId = null,
  sort = 'new',
  limit = 20,
  offset = 0,
}) => {
  const params = [];
  const conditions = [];

  // Viewer ID for userVote lookup
  params.push(userId); // $1

  if (communityId) {
    params.push(communityId);
    conditions.push(`p.community_id = $${params.length}`);
  } else if (type === 'home' && userId) {
    params.push(userId);
    conditions.push(
      `p.community_id IN (SELECT community_id FROM community_members WHERE user_id = $${params.length})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderByClause = 'ORDER BY p.created_at DESC';
  if (sort === 'trending' || sort === 'hot') {
    orderByClause =
      'ORDER BY (p.score / POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.5)) DESC, p.created_at DESC';
  } else if (sort === 'top') {
    orderByClause = 'ORDER BY p.score DESC, p.created_at DESC';
  } else if (sort === 'new') {
    orderByClause = 'ORDER BY p.created_at DESC';
  }

  // Count total query
  const countParams = params.slice(1); // skip userId ($1) used for userVote
  let countWhereClause = '';
  if (communityId) {
    countWhereClause = 'WHERE p.community_id = $1';
  } else if (type === 'home' && userId) {
    countWhereClause = 'WHERE p.community_id IN (SELECT community_id FROM community_members WHERE user_id = $1)';
  }

  const countQuery = `SELECT COUNT(*)::int AS total FROM posts p ${countWhereClause}`;
  const countRes = await query(countQuery, countParams);
  const total = countRes.rows[0]?.total || 0;

  // Posts query
  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const postsQuery = `
    SELECT p.id, p.community_id, p.author_id, p.title, p.content, p.image_url, p.score, p.created_at, p.updated_at,
           u.username AS author_username, u.display_name AS author_display_name,
           c.name AS community_name,
           COALESCE(pv.vote_value, 0)::int AS user_vote
    FROM posts p
    JOIN users u ON u.id = p.author_id
    JOIN communities c ON c.id = p.community_id
    LEFT JOIN post_votes pv ON pv.post_id = p.id AND pv.user_id = $1::int
    ${whereClause}
    ${orderByClause}
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const postsRes = await query(postsQuery, params);

  return {
    rows: postsRes.rows,
    total,
  };
};
