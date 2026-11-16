import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import pool from '../src/config/db.js';

describe('Users API (Phase 2)', () => {
  let server;
  let baseUrl;
  let authBaseUrl;
  let testUserToken;
  let testUser;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/users`;
        authBaseUrl = `http://localhost:${port}/api/auth`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");

    // Register a standard test user
    const regRes = await fetch(`${authBaseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        email: 'alice@example.com',
        password: 'password123',
        displayName: 'Alice In Tech',
      }),
    });
    const regData = await regRes.json();
    testUser = regData.user;
    testUserToken = regData.token;
  });

  test('GET /api/users/:username - returns profile with user details, karma, and empty posts/comments', async () => {
    const res = await fetch(`${baseUrl}/alice`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.user.username, 'alice');
    assert.strictEqual(data.user.displayName, 'Alice In Tech');
    assert.strictEqual(data.user.karma, 0);
    assert.strictEqual(data.user.bio, null);
    assert.ok(data.user.createdAt);
    assert.strictEqual(data.user.password_hash, undefined);
    assert.deepStrictEqual(data.posts, []);
    assert.deepStrictEqual(data.comments, []);
  });

  test('GET /api/users/:username - matches username case-insensitively', async () => {
    const res = await fetch(`${baseUrl}/ALICE`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.user.username, 'alice');
  });

  test('GET /api/users/:username - returns 404 for unknown username', async () => {
    const res = await fetch(`${baseUrl}/nonexistent_user`);
    const data = await res.json();

    assert.strictEqual(res.status, 404);
    assert.ok(data.message.toLowerCase().includes('not found'));
  });

  test('PUT /api/users/profile - successfully updates bio and displayName for authenticated user', async () => {
    const updateRes = await fetch(`${baseUrl}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserToken}`,
      },
      body: JSON.stringify({
        displayName: 'Alice Wonderland',
        bio: 'Full-stack builder passionate about open source and React Native.',
      }),
    });
    const data = await updateRes.json();

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(data.user.displayName, 'Alice Wonderland');
    assert.strictEqual(data.user.bio, 'Full-stack builder passionate about open source and React Native.');
    assert.strictEqual(data.user.username, 'alice');

    // Confirm persisted via GET
    const getRes = await fetch(`${baseUrl}/alice`);
    const getData = await getRes.json();
    assert.strictEqual(getData.user.displayName, 'Alice Wonderland');
    assert.strictEqual(getData.user.bio, 'Full-stack builder passionate about open source and React Native.');
  });

  test('PUT /api/users/profile - rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: 'Hacker' }),
    });
    assert.strictEqual(res.status, 401);
  });

  test('PUT /api/users/profile - validates input length limits', async () => {
    const longBio = 'a'.repeat(501);
    const res = await fetch(`${baseUrl}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserToken}`,
      },
      body: JSON.stringify({ bio: longBio }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.ok(data.message.toLowerCase().includes('bio'));
  });
});
