import { query } from '../../config/db.js';

export const findUserByUsernameOrEmail = async (username, email) => {
  const result = await query(
    'SELECT id, username, email FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
    [username, email]
  );
  return result.rows[0] || null;
};

export const findUserByIdentifier = async (identifier) => {
  const result = await query(
    `SELECT id, username, email, display_name, bio, karma, password_hash, created_at
     FROM users
     WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)`,
    [identifier]
  );
  return result.rows[0] || null;
};

export const findUserById = async (id) => {
  const result = await query(
    `SELECT id, username, email, display_name, bio, karma, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const createUser = async ({ username, email, passwordHash, displayName }) => {
  const result = await query(
    `INSERT INTO users (username, email, password_hash, display_name, karma)
     VALUES ($1, $2, $3, $4, 0)
     RETURNING id, username, email, display_name, bio, karma, created_at`,
    [username, email, passwordHash, displayName]
  );
  return result.rows[0];
};
