import pool, { query } from '../../config/db.js';

export const createComment = async ({ postId, authorId, parentCommentId = null, content }) => {
  const result = await query(
    `INSERT INTO comments (post_id, author_id, parent_comment_id, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id, post_id, author_id, parent_comment_id, content, score, created_at, updated_at`,
    [postId, authorId, parentCommentId, content]
  );
  return result.rows[0];
};

export const findCommentById = async (id, currentUserId = null) => {
  const result = await query(
    `SELECT c.id, c.post_id, c.author_id, c.parent_comment_id, c.content, c.score, c.created_at, c.updated_at,
            u.username AS author_username, u.display_name AS author_display_name,
            COALESCE(cv.vote_value, 0)::int AS user_vote
     FROM comments c
     JOIN users u ON u.id = c.author_id
     LEFT JOIN comment_votes cv ON cv.comment_id = c.id AND cv.user_id = $2::int
     WHERE c.id = $1`,
    [id, currentUserId]
  );
  return result.rows[0] || null;
};

export const findCommentsByPostId = async (postId, currentUserId = null) => {
  const result = await query(
    `SELECT c.id, c.post_id, c.author_id, c.parent_comment_id, c.content, c.score, c.created_at, c.updated_at,
            u.username AS author_username, u.display_name AS author_display_name,
            COALESCE(cv.vote_value, 0)::int AS user_vote
     FROM comments c
     JOIN users u ON u.id = c.author_id
     LEFT JOIN comment_votes cv ON cv.comment_id = c.id AND cv.user_id = $2::int
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [postId, currentUserId]
  );
  return result.rows;
};

export const hasChildReplies = async (commentId) => {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1 FROM comments WHERE parent_comment_id = $1
     ) AS has_children`,
    [commentId]
  );
  return Boolean(result.rows[0]?.has_children);
};

export const updateComment = async (id, { content }) => {
  const result = await query(
    `UPDATE comments
     SET content = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, post_id, author_id, parent_comment_id, content, score, created_at, updated_at`,
    [content, id]
  );
  return result.rows[0] || null;
};

export const tombstoneComment = async (id) => {
  const result = await query(
    `UPDATE comments
     SET content = '[deleted]', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, post_id, author_id, parent_comment_id, content, score, created_at, updated_at`,
    [id]
  );
  return result.rows[0] || null;
};

export const deleteComment = async (id) => {
  const result = await query('DELETE FROM comments WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

export const findCommentsByAuthor = async (authorId) => {
  const result = await query(
    `SELECT c.id, c.post_id, c.author_id, c.parent_comment_id, c.content, c.score, c.created_at, c.updated_at,
            p.title AS post_title,
            comm.id AS community_id, comm.name AS community_name
     FROM comments c
     JOIN posts p ON p.id = c.post_id
     JOIN communities comm ON comm.id = p.community_id
     WHERE c.author_id = $1 AND c.content != '[deleted]'
     ORDER BY c.created_at DESC`,
    [authorId]
  );
  return result.rows;
};

export const handleCommentVote = async ({ commentId, userId, voteValue }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const commentRes = await client.query(
      'SELECT id, author_id, score FROM comments WHERE id = $1 FOR UPDATE',
      [commentId]
    );
    if (commentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const comment = commentRes.rows[0];
    const oldScore = Number(comment.score) || 0;

    const voteRes = await client.query(
      'SELECT vote_value FROM comment_votes WHERE comment_id = $1 AND user_id = $2 FOR UPDATE',
      [commentId, userId]
    );
    const existingVote = voteRes.rows[0]?.vote_value || 0;

    let finalVote = 0;

    if (existingVote === 0) {
      await client.query(
        'INSERT INTO comment_votes (comment_id, user_id, vote_value) VALUES ($1, $2, $3)',
        [commentId, userId, voteValue]
      );
      finalVote = voteValue;
    } else if (existingVote === voteValue) {
      await client.query(
        'DELETE FROM comment_votes WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId]
      );
      finalVote = 0;
    } else {
      await client.query(
        'UPDATE comment_votes SET vote_value = $3, updated_at = CURRENT_TIMESTAMP WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId, voteValue]
      );
      finalVote = voteValue;
    }

    // Comment score floored at 0 (Reddit rule)
    const sumRes = await client.query(
      'SELECT GREATEST(0, COALESCE(SUM(vote_value), 0))::int AS new_score FROM comment_votes WHERE comment_id = $1',
      [commentId]
    );
    const newScore = sumRes.rows[0].new_score;
    const scoreDelta = newScore - oldScore;

    await client.query(
      'UPDATE comments SET score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newScore, commentId]
    );

    if (scoreDelta !== 0) {
      await client.query(
        'UPDATE users SET karma = karma + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [scoreDelta, comment.author_id]
      );
    }

    await client.query('COMMIT');
    return { newScore, finalVote };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
