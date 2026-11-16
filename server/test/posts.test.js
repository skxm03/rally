import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import pool from '../src/config/db.js';

describe('Posts, Image Uploads, and Voting API (Phase 3)', () => {
  let server;
  let baseUrl;
  let authBaseUrl;
  let commBaseUrl;
  let usersBaseUrl;
  let authorToken;
  let authorUser;
  let memberToken;
  let memberUser;
  let outsiderToken;
  let outsiderUser;
  let testCommunity;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/posts`;
        authBaseUrl = `http://localhost:${port}/api/auth`;
        commBaseUrl = `http://localhost:${port}/api/communities`;
        usersBaseUrl = `http://localhost:${port}/api/users`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.query('DELETE FROM posts');
    await pool.query('DELETE FROM communities');
    await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM posts');
    await pool.query('DELETE FROM communities');
    await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");

    // 1. Register Author
    const regAuthor = await fetch(`${authBaseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'post_author',
        email: 'post_author@example.com',
        password: 'password123',
        displayName: 'Post Author',
      }),
    });
    const dataAuthor = await regAuthor.json();
    authorUser = dataAuthor.user;
    authorToken = dataAuthor.token;

    // 2. Register Member (will join community)
    const regMember = await fetch(`${authBaseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'active_member',
        email: 'active_member@example.com',
        password: 'password123',
        displayName: 'Active Member',
      }),
    });
    const dataMember = await regMember.json();
    memberUser = dataMember.user;
    memberToken = dataMember.token;

    // 3. Register Outsider (does not join community)
    const regOutsider = await fetch(`${authBaseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'outsider_user',
        email: 'outsider_user@example.com',
        password: 'password123',
        displayName: 'Outsider User',
      }),
    });
    const dataOutsider = await regOutsider.json();
    outsiderUser = dataOutsider.user;
    outsiderToken = dataOutsider.token;

    // 4. Create community (author is creator and member)
    const commRes = await fetch(`${commBaseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        name: 'tech',
        description: 'Technology discussions',
      }),
    });
    const commData = await commRes.json();
    testCommunity = commData.community;

    // 5. Member joins community
    await fetch(`${commBaseUrl}/${testCommunity.id}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
  });

  // --- SLICE 1: Image Upload ---
  test('POST /api/upload - uploads an image and returns static file URL', async () => {
    const formData = new FormData();
    const fakeImageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const fileBlob = new Blob([fakeImageBytes], { type: 'image/jpeg' });
    formData.append('image', fileBlob, 'test.jpg');

    const uploadUrl = baseUrl.replace('/api/posts', '/api/upload');
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authorToken}` },
      body: formData,
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.ok(data.imageUrl);
    assert.ok(data.imageUrl.startsWith('/uploads/'));
  });

  test('POST /api/upload - rejects missing file or non-image types', async () => {
    const uploadUrl = baseUrl.replace('/api/posts', '/api/upload');

    // Missing file
    const resMissing = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authorToken}` },
      body: new FormData(),
    });
    assert.strictEqual(resMissing.status, 400);

    // Non-image file (text/plain)
    const formInvalid = new FormData();
    formInvalid.append('image', new Blob(['hello world'], { type: 'text/plain' }), 'test.txt');
    const resInvalid = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authorToken}` },
      body: formInvalid,
    });
    assert.strictEqual(resInvalid.status, 400);
  });

  // --- SLICE 2: Post Creation & Membership Invariant ---
  test('POST /api/posts - allows joined member to create text and image post', async () => {
    const res = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        communityId: testCommunity.id,
        title: 'Building React Native in 2026',
        content: 'Here are my thoughts on modern React Native architecture.',
        imageUrl: '/uploads/sample.png',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.post.title, 'Building React Native in 2026');
    assert.strictEqual(data.post.content, 'Here are my thoughts on modern React Native architecture.');
    assert.strictEqual(data.post.imageUrl, '/uploads/sample.png');
    assert.strictEqual(data.post.score, 0);
    assert.strictEqual(data.post.communityId, testCommunity.id);
    assert.strictEqual(data.post.authorId, memberUser.id);
    assert.ok(data.post.createdAt);
  });

  test('POST /api/posts - forbids non-member from posting in community', async () => {
    const res = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({
        communityId: testCommunity.id,
        title: 'Spam from an outsider',
        content: 'I did not join this community!',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.ok(data.message.toLowerCase().includes('must join'));
  });

  test('POST /api/posts - validates required title and body/image presence', async () => {
    // Missing title
    const resNoTitle = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        communityId: testCommunity.id,
        content: 'No title given',
      }),
    });
    assert.strictEqual(resNoTitle.status, 400);

    // Missing both content and image
    const resEmpty = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        communityId: testCommunity.id,
        title: 'Only title here',
      }),
    });
    assert.strictEqual(resEmpty.status, 400);
  });

  // --- SLICE 3: Post Retrieval & Viewer Context ---
  test('GET /api/posts/:id - returns post details with author, community, and userVote', async () => {
    const createRes = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        communityId: testCommunity.id,
        title: 'Architecture Patterns',
        content: 'Deep modules vs shallow modules.',
      }),
    });
    const { post } = await createRes.json();

    // Guest lookup (no auth token)
    const guestRes = await fetch(`${baseUrl}/${post.id}`);
    const guestData = await guestRes.json();
    assert.strictEqual(guestRes.status, 200);
    assert.strictEqual(guestData.post.title, 'Architecture Patterns');
    assert.strictEqual(guestData.post.author.username, 'post_author');
    assert.strictEqual(guestData.post.community.name, 'tech');
    assert.strictEqual(guestData.post.score, 0);
    assert.strictEqual(guestData.post.userVote, 0);

    // Authenticated lookup
    const authRes = await fetch(`${baseUrl}/${post.id}`, {
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    const authData = await authRes.json();
    assert.strictEqual(authRes.status, 200);
    assert.strictEqual(authData.post.userVote, 0);
  });

  // --- SLICE 4: Post Update & Delete ---
  test('PUT /api/posts/:id - allows author to update title and content', async () => {
    const createRes = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        communityId: testCommunity.id,
        title: 'Initial Title',
        content: 'Initial Content',
      }),
    });
    const { post } = await createRes.json();

    // Author edits
    const editRes = await fetch(`${baseUrl}/${post.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        title: 'Updated Title',
        content: 'Updated Content with more insights',
      }),
    });
    const editData = await editRes.json();
    assert.strictEqual(editRes.status, 200);
    assert.strictEqual(editData.post.title, 'Updated Title');
    assert.strictEqual(editData.post.content, 'Updated Content with more insights');

    // Non-author forbidden from editing
    const hackerRes = await fetch(`${baseUrl}/${post.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ title: 'Hacked Title' }),
    });
    assert.strictEqual(hackerRes.status, 403);
  });

  test('DELETE /api/posts/:id - allows author to delete own post and rejects non-author', async () => {
    const createRes = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        communityId: testCommunity.id,
        title: 'Post to Delete',
        content: 'This will be deleted.',
      }),
    });
    const { post } = await createRes.json();

    // Non-author attempt to delete
    const forbiddenRes = await fetch(`${baseUrl}/${post.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.strictEqual(forbiddenRes.status, 403);

    // Author deletes
    const deleteRes = await fetch(`${baseUrl}/${post.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert.strictEqual(deleteRes.status, 200);

    // Confirm 404 after deletion
    const getRes = await fetch(`${baseUrl}/${post.id}`);
    assert.strictEqual(getRes.status, 404);
  });

  // --- SLICE 5: Voting, Score, and Karma Tracking ---
  test('POST /api/posts/:id/vote - handles upvote, toggle cancel, and reverse downvote atomically with karma', async () => {
    // 1. Author publishes post
    const createRes = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        communityId: testCommunity.id,
        title: 'Karma and Voting Mechanics',
        content: 'A deep dive into atomic post score and author karma synchronization.',
      }),
    });
    const { post } = await createRes.json();

    // Author initial karma is 0
    let userRes = await fetch(`${usersBaseUrl}/post_author`);
    let userData = await userRes.json();
    assert.strictEqual(userData.user.karma, 0);

    // 2. Member casts upvote (+1)
    const voteUpRes = await fetch(`${baseUrl}/${post.id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ voteValue: 1 }),
    });
    const voteUpData = await voteUpRes.json();
    assert.strictEqual(voteUpRes.status, 200);
    assert.strictEqual(voteUpData.score, 1);
    assert.strictEqual(voteUpData.voteValue, 1);

    // Check author karma incremented to 1
    userRes = await fetch(`${usersBaseUrl}/post_author`);
    userData = await userRes.json();
    assert.strictEqual(userData.user.karma, 1);

    // Check post details reflect userVote=1 for member
    let postDetails = await fetch(`${baseUrl}/${post.id}`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    let postData = await postDetails.json();
    assert.strictEqual(postData.post.score, 1);
    assert.strictEqual(postData.post.userVote, 1);

    // 3. Member clicks upvote (+1) again -> TOGGLE TO CANCEL (score back to 0, karma back to 0)
    const toggleRes = await fetch(`${baseUrl}/${post.id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ voteValue: 1 }),
    });
    const toggleData = await toggleRes.json();
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleData.score, 0);
    assert.strictEqual(toggleData.voteValue, 0);

    userRes = await fetch(`${usersBaseUrl}/post_author`);
    userData = await userRes.json();
    assert.strictEqual(userData.user.karma, 0);

    // 4. Member casts downvote (-1) -> score is -1, karma is -1
    const downRes = await fetch(`${baseUrl}/${post.id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ voteValue: -1 }),
    });
    const downData = await downRes.json();
    assert.strictEqual(downRes.status, 200);
    assert.strictEqual(downData.score, -1);
    assert.strictEqual(downData.voteValue, -1);

    userRes = await fetch(`${usersBaseUrl}/post_author`);
    userData = await userRes.json();
    assert.strictEqual(userData.user.karma, -1);

    // 5. Member flips vote directly from -1 to +1 -> delta is +2, score is 1, karma is 1
    const flipRes = await fetch(`${baseUrl}/${post.id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ voteValue: 1 }),
    });
    const flipData = await flipRes.json();
    assert.strictEqual(flipRes.status, 200);
    assert.strictEqual(flipData.score, 1);
    assert.strictEqual(flipData.voteValue, 1);

    userRes = await fetch(`${usersBaseUrl}/post_author`);
    userData = await userRes.json();
    assert.strictEqual(userData.user.karma, 1);
  });

  // --- Integration: User Profile Posts List ---
  test('GET /api/users/:username - returns the user published posts', async () => {
    await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        communityId: testCommunity.id,
        title: 'Author First Post',
        content: 'Content 1',
      }),
    });

    const res = await fetch(`${usersBaseUrl}/post_author`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.posts.length, 1);
    assert.strictEqual(data.posts[0].title, 'Author First Post');
  });
});
