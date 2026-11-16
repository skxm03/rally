import pool, { query } from '../../config/db.js';

export const createCommunityWithCreator = async ({ name, description, createdBy }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const commResult = await client.query(
      `INSERT INTO communities (name, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, created_by, created_at`,
      [name, description, createdBy]
    );
    const community = commResult.rows[0];

    await client.query(
      `INSERT INTO community_members (community_id, user_id)
       VALUES ($1, $2)`,
      [community.id, createdBy]
    );

    await client.query('COMMIT');
    return community;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const findCommunityByName = async (name, currentUserId = null) => {
  const result = await query(
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
     WHERE LOWER(c.name) = LOWER($1)
     GROUP BY c.id`,
    [name, currentUserId]
  );
  return result.rows[0] || null;
};

export const findCommunityById = async (id) => {
  const result = await query(
    `SELECT id, name, description, created_by, created_at
     FROM communities
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const findCommunityByNameOnly = async (name) => {
  const result = await query(
    `SELECT id, name FROM communities WHERE LOWER(name) = LOWER($1)`,
    [name]
  );
  return result.rows[0] || null;
};

export const listCommunities = async (currentUserId = null) => {
  const result = await query(
    `SELECT c.id, c.name, c.description, c.created_by, c.created_at,
            COUNT(DISTINCT cm.user_id)::int AS member_count,
            CASE
              WHEN $1::int IS NULL THEN false
              ELSE EXISTS (
                SELECT 1 FROM community_members cm2
                WHERE cm2.community_id = c.id AND cm2.user_id = $1::int
              )
            END AS is_member
     FROM communities c
     LEFT JOIN community_members cm ON cm.community_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [currentUserId]
  );
  return result.rows;
};

export const joinCommunity = async (communityId, userId) => {
  await query(
    `INSERT INTO community_members (community_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (community_id, user_id) DO NOTHING`,
    [communityId, userId]
  );
};

export const leaveCommunity = async (communityId, userId) => {
  await query(
    `DELETE FROM community_members
     WHERE community_id = $1 AND user_id = $2`,
    [communityId, userId]
  );
};
