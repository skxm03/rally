import pool, { query } from '../../config/db.js';

export const createPost = async ({ communityId, authorId, title, content, imageUrl }) => {
  const result = await query(
    `INSERT INTO posts (community_id, author_id, title, content, image_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, community_id, author_id, title, content, image_url, score, created_at, updated_at`,
    [communityId, authorId, title, content, imageUrl]
  );
  return result.rows[0];
};

export const findPostById = async (id, currentUserId = null) => {
  const result = await query(
    `SELECT p.id, p.community_id, p.author_id, p.title, p.content, p.image_url, p.score, p.created_at, p.updated_at,
            u.username AS author_username, u.display_name AS author_display_name,
            c.name AS community_name,
            COALESCE(pv.vote_value, 0)::int AS user_vote
     FROM posts p
     JOIN users u ON u.id = p.author_id
     JOIN communities c ON c.id = p.community_id
     LEFT JOIN post_votes pv ON pv.post_id = p.id AND pv.user_id = $2::int
     WHERE p.id = $1`,
    [id, currentUserId]
  );
  return result.rows[0] || null;
};

export const isCommunityMember = async (communityId, userId) => {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2
     ) AS is_member`,
    [communityId, userId]
  );
  return Boolean(result.rows[0]?.is_member);
};

export const updatePost = async (postId, { title, content }) => {
  const result = await query(
    `UPDATE posts
     SET title = COALESCE($1, title),
         content = COALESCE($2, content),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING id, community_id, author_id, title, content, image_url, score, created_at, updated_at`,
    [title, content, postId]
  );
  return result.rows[0] || null;
};

export const deletePost = async (postId) => {
  const result = await query('DELETE FROM posts WHERE id = $1 RETURNING id', [postId]);
  return result.rows[0] || null;
};

export const findPostsByAuthor = async (authorId, currentUserId = null) => {
  const result = await query(
    `SELECT p.id, p.community_id, p.author_id, p.title, p.content, p.image_url, p.score, p.created_at, p.updated_at,
            u.username AS author_username, u.display_name AS author_display_name,
            c.name AS community_name,
            COALESCE(pv.vote_value, 0)::int AS user_vote
     FROM posts p
     JOIN users u ON u.id = p.author_id
     JOIN communities c ON c.id = p.community_id
     LEFT JOIN post_votes pv ON pv.post_id = p.id AND pv.user_id = $2::int
     WHERE p.author_id = $1
     ORDER BY p.created_at DESC`,
    [authorId, currentUserId]
  );
  return result.rows;
};

export const findPostsByCommunity = async (communityId, currentUserId = null) => {
  const result = await query(
    `SELECT p.id, p.community_id, p.author_id, p.title, p.content, p.image_url, p.score, p.created_at, p.updated_at,
            u.username AS author_username, u.display_name AS author_display_name,
            c.name AS community_name,
            COALESCE(pv.vote_value, 0)::int AS user_vote
     FROM posts p
     JOIN users u ON u.id = p.author_id
     JOIN communities c ON c.id = p.community_id
     LEFT JOIN post_votes pv ON pv.post_id = p.id AND pv.user_id = $2::int
     WHERE p.community_id = $1
     ORDER BY p.created_at DESC`,
    [communityId, currentUserId]
  );
  return result.rows;
};

export const handleVote = async ({ postId, userId, voteValue }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const postRes = await client.query(
      'SELECT id, author_id, score FROM posts WHERE id = $1 FOR UPDATE',
      [postId]
    );
    if (postRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const post = postRes.rows[0];

    const voteRes = await client.query(
      'SELECT vote_value FROM post_votes WHERE post_id = $1 AND user_id = $2 FOR UPDATE',
      [postId, userId]
    );
    const existingVote = voteRes.rows[0]?.vote_value || 0;

    let scoreDelta = 0;
    let finalVote = 0;

    if (existingVote === 0) {
      await client.query(
        'INSERT INTO post_votes (post_id, user_id, vote_value) VALUES ($1, $2, $3)',
        [postId, userId, voteValue]
      );
      scoreDelta = voteValue;
      finalVote = voteValue;
    } else if (existingVote === voteValue) {
      await client.query(
        'DELETE FROM post_votes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      scoreDelta = -voteValue;
      finalVote = 0;
    } else {
      await client.query(
        'UPDATE post_votes SET vote_value = $3, updated_at = CURRENT_TIMESTAMP WHERE post_id = $1 AND user_id = $2',
        [postId, userId, voteValue]
      );
      scoreDelta = voteValue - existingVote;
      finalVote = voteValue;
    }

    const updatedPostRes = await client.query(
      'UPDATE posts SET score = score + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING score',
      [scoreDelta, postId]
    );
    const newScore = updatedPostRes.rows[0].score;

    await client.query(
      'UPDATE users SET karma = karma + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [scoreDelta, post.author_id]
    );

    await client.query('COMMIT');
    return { newScore, finalVote };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
