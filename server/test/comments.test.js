import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import pool from '../src/config/db.js';

describe('Comments and Threaded Discussions API (Phase 4)', () => {
  let server;
  let commentsBaseUrl;
  let postsBaseUrl;
  let authBaseUrl;
  let commBaseUrl;
  let usersBaseUrl;

  let authorToken, authorUser;
  let memberToken, memberUser;
  let outsiderToken, outsiderUser;
  let testCommunity;
  let testPost;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        commentsBaseUrl = `http://localhost:${port}/api/comments`;
        postsBaseUrl = `http://localhost:${port}/api/posts`;
        authBaseUrl = `http://localhost:${port}/api/auth`;
        commBaseUrl = `http://localhost:${port}/api/communities`;
        usersBaseUrl = `http://localhost:${port}/api/users`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.query('DELETE FROM comments');
    await pool.query('DELETE FROM posts');
    await pool.query('DELETE FROM communities');
    await pool.query("DELETE FROM users WHERE email LIKE '%@commenttest.com'");
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM comments');
    await pool.query('DELETE FROM posts');
    await pool.query('DELETE FROM communities');
    await pool.query("DELETE FROM users WHERE email LIKE '%@commenttest.com'");

    // 1. Author (creator of community and post)
    const resA = await fetch(`${authBaseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'comment_author',
        email: 'author@commenttest.com',
        password: 'password123',
        displayName: 'Comment Author',
      }),
    });
    const dataA = await resA.json();
    authorUser = dataA.user;
    authorToken = dataA.token;

    // 2. Member (joins community)
    const resM = await fetch(`${authBaseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'comment_member',
        email: 'member@commenttest.com',
        password: 'password123',
        displayName: 'Comment Member',
      }),
    });
    const dataM = await resM.json();
    memberUser = dataM.user;
    memberToken = dataM.token;

    // 3. Outsider (does not join)
    const resO = await fetch(`${authBaseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'comment_outsider',
        email: 'outsider@commenttest.com',
        password: 'password123',
        displayName: 'Comment Outsider',
      }),
    });
    const dataO = await resO.json();
    outsiderUser = dataO.user;
    outsiderToken = dataO.token;

    // 4. Create Community (author is joined)
    const commRes = await fetch(`${commBaseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        name: 'discussions',
        description: 'Community for deep discussions',
      }),
    });
    testCommunity = (await commRes.json()).community;

    // 5. Member joins community
    await fetch(`${commBaseUrl}/${testCommunity.id}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    // 6. Author creates Post
    const postRes = await fetch(`${postsBaseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        communityId: testCommunity.id,
        title: 'Discussing System Design',
        content: 'Let us talk about nested comment threads.',
      }),
    });
    testPost = (await postRes.json()).post;
  });

  // --- SLICE 1: Comment Creation & Community Invariant ---
  test('POST /api/posts/:postId/comments - joined member can comment on post', async () => {
    const res = await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        content: 'This is a top-level thoughtful comment.',
      }),
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.comment.content, 'This is a top-level thoughtful comment.');
    assert.strictEqual(data.comment.postId, testPost.id);
    assert.strictEqual(data.comment.author.username, 'comment_member');
    assert.strictEqual(data.comment.parentCommentId, null);
    assert.strictEqual(data.comment.score, 0);
  });

  test('POST /api/posts/:postId/comments - non-member is forbidden from commenting', async () => {
    const res = await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({ content: 'Spam from non-member' }),
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.ok(data.message.toLowerCase().includes('must join'));
  });

  test('POST /api/posts/:postId/comments - validates non-empty content', async () => {
    const resEmpty = await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ content: '   ' }),
    });
    assert.strictEqual(resEmpty.status, 400);
  });

  // --- SLICE 2: Threaded Nested Replies & Tree Representation ---
  test('POST /api/posts/:postId/comments & GET /api/posts/:postId/comments - builds nested tree structure', async () => {
    // 1. Member creates top-level comment
    const topRes = await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ content: 'Top level parent comment' }),
    });
    const topComment = (await topRes.json()).comment;

    // 2. Author replies to Member comment
    const replyRes = await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        content: 'Reply to parent comment',
        parentCommentId: topComment.id,
      }),
    });
    assert.strictEqual(replyRes.status, 201);
    const replyComment = (await replyRes.json()).comment;
    assert.strictEqual(replyComment.parentCommentId, topComment.id);

    // 3. Member replies to Author reply (nested 2 levels deep)
    const nestedRes = await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        content: 'Deep nested reply',
        parentCommentId: replyComment.id,
      }),
    });
    assert.strictEqual(nestedRes.status, 201);

    // 4. Fetch comment tree
    const treeRes = await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert.strictEqual(treeRes.status, 200);
    const treeData = await treeRes.json();

    assert.ok(Array.isArray(treeData.comments));
    assert.strictEqual(treeData.comments.length, 1); // 1 top-level comment
    const root = treeData.comments[0];
    assert.strictEqual(root.id, topComment.id);
    assert.strictEqual(root.replies.length, 1); // 1 direct reply

    const firstReply = root.replies[0];
    assert.strictEqual(firstReply.id, replyComment.id);
    assert.strictEqual(firstReply.replies.length, 1); // 1 deep reply
    assert.strictEqual(firstReply.replies[0].content, 'Deep nested reply');
  });

  // --- SLICE 3: Update and Tombstone Deletion ---
  test('PUT /api/comments/:id - allows author to update content', async () => {
    const createRes = await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ content: 'Original content' }),
    });
    const { comment } = await createRes.json();

    const editRes = await fetch(`${commentsBaseUrl}/${comment.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ content: 'Edited content' }),
    });
    assert.strictEqual(editRes.status, 200);
    const editData = await editRes.json();
    assert.strictEqual(editData.comment.content, 'Edited content');

    // Non-author rejected
    const hackerRes = await fetch(`${commentsBaseUrl}/${comment.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({ content: 'Hacked content' }),
    });
    assert.strictEqual(hackerRes.status, 403);
  });

  test('DELETE /api/comments/:id - preserves thread with tombstone if comment has replies', async () => {
    // 1. Parent comment
    const parentRes = await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({ content: 'Parent to be tombstoned' }),
    });
    const parent = (await parentRes.json()).comment;

    // 2. Child reply
    await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        content: 'Child staying alive',
        parentCommentId: parent.id,
      }),
    });

    // 3. Author deletes parent comment
    const delRes = await fetch(`${commentsBaseUrl}/${parent.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert.strictEqual(delRes.status, 200);

    // 4. Verify in comment tree: parent content and author masked as [deleted], child still intact
    const treeRes = await fetch(`${postsBaseUrl}/${testPost.id}/comments`);
    const treeData = await treeRes.json();
    assert.strictEqual(treeData.comments.length, 1);
    const tombstone = treeData.comments[0];
    assert.strictEqual(tombstone.content, '[deleted]');
    assert.strictEqual(tombstone.author.username, '[deleted]');
    assert.strictEqual(tombstone.replies.length, 1);
    assert.strictEqual(tombstone.replies[0].content, 'Child staying alive');
  });

  test('DELETE /api/comments/:id - hard deletes comment if it has no replies', async () => {
    const commentRes = await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ content: 'Leaf comment with no replies' }),
    });
    const { comment } = await commentRes.json();

    const delRes = await fetch(`${commentsBaseUrl}/${comment.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.strictEqual(delRes.status, 200);

    const treeRes = await fetch(`${postsBaseUrl}/${testPost.id}/comments`);
    const treeData = await treeRes.json();
    assert.strictEqual(treeData.comments.length, 0);
  });

  // --- SLICE 4: Comment Voting & Karma Synchronization ---
  test('POST /api/comments/:id/vote - handles upvote, toggle cancel, and downvote clamping at 0 with karma sync', async () => {
    const commentRes = await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({ content: 'Comment for karma test' }),
    });
    const { comment } = await commentRes.json();

    // Author karma initial is 0
    let userRes = await fetch(`${usersBaseUrl}/comment_author`);
    let userData = await userRes.json();
    assert.strictEqual(userData.user.karma, 0);

    // 1. Member upvotes (+1)
    const upRes = await fetch(`${commentsBaseUrl}/${comment.id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ voteValue: 1 }),
    });
    assert.strictEqual(upRes.status, 200);
    const upData = await upRes.json();
    assert.strictEqual(upData.score, 1);
    assert.strictEqual(upData.voteValue, 1);

    userRes = await fetch(`${usersBaseUrl}/comment_author`);
    userData = await userRes.json();
    assert.strictEqual(userData.user.karma, 1);

    // 2. Member toggles upvote to cancel (0)
    const toggleRes = await fetch(`${commentsBaseUrl}/${comment.id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ voteValue: 1 }),
    });
    assert.strictEqual(toggleRes.status, 200);
    const toggleData = await toggleRes.json();
    assert.strictEqual(toggleData.score, 0);
    assert.strictEqual(toggleData.voteValue, 0);

    userRes = await fetch(`${usersBaseUrl}/comment_author`);
    userData = await userRes.json();
    assert.strictEqual(userData.user.karma, 0);

    // 3. Member downvotes 0-score comment -> floored at 0, karma stays 0
    const downRes = await fetch(`${commentsBaseUrl}/${comment.id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ voteValue: -1 }),
    });
    assert.strictEqual(downRes.status, 200);
    const downData = await downRes.json();
    assert.strictEqual(downData.score, 0);
    assert.strictEqual(downData.voteValue, -1);

    userRes = await fetch(`${usersBaseUrl}/comment_author`);
    userData = await userRes.json();
    assert.strictEqual(userData.user.karma, 0);
  });

  // --- SLICE 5: User Profile Comments ---
  test('GET /api/users/:username - returns authored comments in profile', async () => {
    await fetch(`${postsBaseUrl}/${testPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({ content: 'Authored comment by author' }),
    });

    const res = await fetch(`${usersBaseUrl}/comment_author`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.comments));
    assert.strictEqual(data.comments.length, 1);
    assert.strictEqual(data.comments[0].content, 'Authored comment by author');
    assert.strictEqual(data.comments[0].post.title, 'Discussing System Design');
    assert.strictEqual(data.comments[0].community.name, 'discussions');
  });
});
