import { query } from '../../config/db.js';

export const findProfileByUsername = async (username) => {
  const result = await query(
    `SELECT id, username, display_name, bio, karma, created_at
     FROM users
     WHERE LOWER(username) = LOWER($1)`,
    [username]
  );
  return result.rows[0] || null;
};

export const updateUserProfile = async (userId, { displayName, bio }) => {
  const result = await query(
    `UPDATE users
     SET display_name = COALESCE($1, display_name),
         bio = COALESCE($2, bio),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING id, username, display_name, bio, karma, created_at`,
    [displayName, bio, userId]
  );
  return result.rows[0] || null;
};
