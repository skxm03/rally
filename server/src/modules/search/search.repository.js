import { query } from '../../config/db.js';

export const searchPosts = async ({ q, viewerId = null, limit = 20, offset = 0 }) => {
  const pattern = `%${q}%`;
  const countRes = await query(
    `SELECT COUNT(*)::int AS total
     FROM posts p
     JOIN communities c ON c.id = p.community_id
     WHERE (p.title ILIKE $1 OR (p.content IS NOT NULL AND p.content ILIKE $1) OR c.name ILIKE $1)`,
    [pattern]
  );
  const total = countRes.rows[0]?.total || 0;

  const postsRes = await query(
    `SELECT p.id, p.community_id, p.author_id, p.title, p.content, p.image_url, p.score, p.created_at, p.updated_at,
            u.username AS author_username, u.display_name AS author_display_name,
            c.name AS community_name,
            COALESCE(pv.vote_value, 0)::int AS user_vote
     FROM posts p
     JOIN users u ON u.id = p.author_id
     JOIN communities c ON c.id = p.community_id
     LEFT JOIN post_votes pv ON pv.post_id = p.id AND pv.user_id = $2::int
     WHERE (p.title ILIKE $1 OR (p.content IS NOT NULL AND p.content ILIKE $1) OR c.name ILIKE $1)
     ORDER BY p.score DESC, p.created_at DESC
     LIMIT $3 OFFSET $4`,
    [pattern, viewerId, limit, offset]
  );

  return { rows: postsRes.rows, total };
};

export const searchCommunities = async ({ q, viewerId = null, limit = 20, offset = 0 }) => {
  const pattern = `%${q}%`;
  const countRes = await query(
    `SELECT COUNT(*)::int AS total
     FROM communities
     WHERE (name ILIKE $1 OR (description IS NOT NULL AND description ILIKE $1))`,
    [pattern]
  );
  const total = countRes.rows[0]?.total || 0;

  const commRes = await query(
    `SELECT c.id, c.name, c.description, c.created_by, c.created_at,
            COUNT(DISTINCT cm.user_id)::int AS member_count,
            CASE
              WHEN $2::int IS NULL THEN false
              ELSE EXISTS (
                SELECT 1 FROM community_members cm2
                WHERE cm2.community_id = c.id AND cm2.user_id = $2::int
              )
            END AS is_member
     FROM communities c
     LEFT JOIN community_members cm ON cm.community_id = c.id
     WHERE (c.name ILIKE $1 OR (c.description IS NOT NULL AND c.description ILIKE $1))
     GROUP BY c.id
     ORDER BY member_count DESC, c.created_at DESC
     LIMIT $3 OFFSET $4`,
    [pattern, viewerId, limit, offset]
  );

  return { rows: commRes.rows, total };
};

export const searchUsers = async ({ q, limit = 20, offset = 0 }) => {
  const pattern = `%${q}%`;
  const countRes = await query(
    `SELECT COUNT(*)::int AS total
     FROM users
     WHERE (username ILIKE $1 OR (display_name IS NOT NULL AND display_name ILIKE $1))`,
    [pattern]
  );
  const total = countRes.rows[0]?.total || 0;

  const usersRes = await query(
    `SELECT u.id, u.username, u.display_name, u.bio, u.karma, u.created_at
     FROM users u
     WHERE (username ILIKE $1 OR (display_name IS NOT NULL AND display_name ILIKE $1))
     ORDER BY u.karma DESC, u.created_at DESC
     LIMIT $2 OFFSET $3`,
    [pattern, limit, offset]
  );

  return { rows: usersRes.rows, total };
};
