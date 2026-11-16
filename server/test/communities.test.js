import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import pool from '../src/config/db.js';

describe('Communities API (Phase 2)', () => {
  let server;
  let baseUrl;
  let authBaseUrl;
  let user1Token;
  let user1;
  let user2Token;
  let user2;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/communities`;
        authBaseUrl = `http://localhost:${port}/api/auth`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.query('DELETE FROM communities');
    await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM communities');
    await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");

    // User 1 (Creator)
    const reg1 = await fetch(`${authBaseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'creator_bob',
        email: 'creator_bob@example.com',
        password: 'password123',
      }),
    });
    const data1 = await reg1.json();
    user1 = data1.user;
    user1Token = data1.token;

    // User 2 (Member)
    const reg2 = await fetch(`${authBaseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'joiner_carol',
        email: 'joiner_carol@example.com',
        password: 'password123',
      }),
    });
    const data2 = await reg2.json();
    user2 = data2.user;
    user2Token = data2.token;
  });

  test('POST /api/communities - creator creates community and is automatically joined', async () => {
    const res = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'reactnative',
        description: 'A space for React Native mobile developers',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.community.name, 'reactnative');
    assert.strictEqual(data.community.description, 'A space for React Native mobile developers');
    assert.strictEqual(data.community.createdBy, user1.id);
    assert.strictEqual(data.community.memberCount, 1, 'Creator must be counted as first member');
    assert.strictEqual(data.community.isMember, true);
  });

  test('POST /api/communities - validates name format and length', async () => {
    // Too short (< 3 chars)
    const resShort = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ name: 'ab' }),
    });
    assert.strictEqual(resShort.status, 400);

    // Invalid characters (spaces/special characters)
    const resInvalid = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ name: 'react native!' }),
    });
    assert.strictEqual(resInvalid.status, 400);
  });

  test('POST /api/communities - rejects duplicate names case-insensitively', async () => {
    await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ name: 'javascript', description: 'JS dev' }),
    });

    const dupRes = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({ name: 'JavaScript', description: 'Duplicate attempt' }),
    });
    const dupData = await dupRes.json();

    assert.strictEqual(dupRes.status, 409);
    assert.ok(dupData.message.toLowerCase().includes('already taken'));
  });

  test('GET /api/communities - lists communities with dynamic member count and viewer isMember status', async () => {
    // Create two communities
    await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ name: 'node', description: 'NodeJS ecosystem' }),
    });

    // Unauthenticated GET
    const publicRes = await fetch(`${baseUrl}`);
    const publicData = await publicRes.json();
    assert.strictEqual(publicRes.status, 200);
    assert.ok(Array.isArray(publicData.communities));
    assert.strictEqual(publicData.communities[0].name, 'node');
    assert.strictEqual(publicData.communities[0].memberCount, 1);
    assert.strictEqual(publicData.communities[0].isMember, false);

    // Authenticated GET (user1 is creator and member)
    const authRes = await fetch(`${baseUrl}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const authData = await authRes.json();
    assert.strictEqual(authRes.status, 200);
    assert.strictEqual(authData.communities[0].isMember, true);
  });

  test('GET /api/communities/:name - fetches community by name case-insensitively', async () => {
    await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ name: 'typescript', description: 'Typed JS' }),
    });

    const res = await fetch(`${baseUrl}/TypeScript`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.community.name, 'typescript');
    assert.strictEqual(data.community.memberCount, 1);
    assert.strictEqual(data.community.isMember, true);

    // Non-existent community
    const notFoundRes = await fetch(`${baseUrl}/non_existent_community`);
    assert.strictEqual(notFoundRes.status, 404);
  });

  test('POST /api/communities/:id/join - allows user to join community idempotently', async () => {
    const createRes = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ name: 'devops', description: 'Infra and CI/CD' }),
    });
    const { community } = await createRes.json();

    // User 2 joins
    const joinRes = await fetch(`${baseUrl}/${community.id}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const joinData = await joinRes.json();
    assert.strictEqual(joinRes.status, 200);
    assert.strictEqual(joinData.isMember, true);

    // Verify member count is now 2
    const commRes = await fetch(`${baseUrl}/devops`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const commData = await commRes.json();
    assert.strictEqual(commData.community.memberCount, 2);
    assert.strictEqual(commData.community.isMember, true);

    // Second join attempt (idempotent)
    const repeatJoinRes = await fetch(`${baseUrl}/${community.id}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.strictEqual(repeatJoinRes.status, 200);
  });

  test('POST /api/communities/:id/leave - allows regular member to leave idempotently', async () => {
    const createRes = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ name: 'design', description: 'UI/UX' }),
    });
    const { community } = await createRes.json();

    // User 2 joins
    await fetch(`${baseUrl}/${community.id}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` },
    });

    // User 2 leaves
    const leaveRes = await fetch(`${baseUrl}/${community.id}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const leaveData = await leaveRes.json();
    assert.strictEqual(leaveRes.status, 200);
    assert.strictEqual(leaveData.isMember, false);

    // Verify count dropped back to 1
    const commRes = await fetch(`${baseUrl}/design`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const commData = await commRes.json();
    assert.strictEqual(commData.community.memberCount, 1);
    assert.strictEqual(commData.community.isMember, false);

    // Repeat leave (idempotent)
    const repeatLeaveRes = await fetch(`${baseUrl}/${community.id}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.strictEqual(repeatLeaveRes.status, 200);
  });

  test('POST /api/communities/:id/leave - creator cannot leave community', async () => {
    const createRes = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ name: 'founders', description: 'Startup founders' }),
    });
    const { community } = await createRes.json();

    // User 1 (Creator) attempts to leave
    const leaveRes = await fetch(`${baseUrl}/${community.id}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const leaveData = await leaveRes.json();

    assert.strictEqual(leaveRes.status, 400);
    assert.ok(leaveData.message.toLowerCase().includes('creator cannot leave'));
  });

  test('POST /api/communities/:id/join and leave - reject invalid community ID with 400', async () => {
    const invalidJoinRes = await fetch(`${baseUrl}/not-an-id/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.strictEqual(invalidJoinRes.status, 400);

    const invalidLeaveRes = await fetch(`${baseUrl}/-5/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.strictEqual(invalidLeaveRes.status, 400);
  });
});
