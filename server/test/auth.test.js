import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import pool from '../src/config/db.js';

describe('Auth API (Phase 1)', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Start server on an ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/auth`;
        resolve();
      });
    });
  });

  after(async () => {
    // Cleanup server and db pool
    await new Promise((resolve) => server.close(resolve));
    await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");
  });

  test('POST /register - successfully registers a new user', async () => {
    const payload = {
      username: 'rallyuser',
      email: 'rallyuser@example.com',
      password: 'password123',
      displayName: 'Rally User',
    };

    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.token, 'Expected JWT token in response');
    assert.strictEqual(data.user.username, 'rallyuser');
    assert.strictEqual(data.user.email, 'rallyuser@example.com');
    assert.strictEqual(data.user.displayName, 'Rally User');
    assert.strictEqual(data.user.karma, 0);
    assert.strictEqual(data.user.password_hash, undefined, 'password_hash must not be exposed');
  });

  test('POST /register - fails on missing required fields or invalid input', async () => {
    const resShortPassword = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'validuser',
        email: 'valid@example.com',
        password: '123',
      }),
    });
    const dataShort = await resShortPassword.json();
    assert.strictEqual(resShortPassword.status, 400);
    assert.ok(dataShort.message.includes('at least 8 characters'));

    const resInvalidEmail = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'validuser',
        email: 'not-an-email',
        password: 'password123',
      }),
    });
    assert.strictEqual(resInvalidEmail.status, 400);
  });

  test('POST /register - rejects duplicate username or email case-insensitively', async () => {
    // Initial registration
    await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'RallyUser',
        email: 'rallyuser@example.com',
        password: 'password123',
      }),
    });

    // Attempt duplicate username with different casing
    const dupUserRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'rallyuser',
        email: 'other@example.com',
        password: 'password123',
      }),
    });
    const dupUserData = await dupUserRes.json();
    assert.strictEqual(dupUserRes.status, 409);
    assert.strictEqual(dupUserData.message, 'Username is already taken');

    // Attempt duplicate email with different casing
    const dupEmailRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'otheruser',
        email: 'RALLYUSER@EXAMPLE.COM',
        password: 'password123',
      }),
    });
    const dupEmailData = await dupEmailRes.json();
    assert.strictEqual(dupEmailRes.status, 409);
    assert.strictEqual(dupEmailData.message, 'Email is already registered');
  });

  test('POST /login - allows login with email or username', async () => {
    // Register user first
    await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'password123',
      }),
    });

    // 1. Login with email
    const emailLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'login@example.com',
        password: 'password123',
      }),
    });
    const emailLoginData = await emailLoginRes.json();
    assert.strictEqual(emailLoginRes.status, 200);
    assert.ok(emailLoginData.token);
    assert.strictEqual(emailLoginData.user.username, 'loginuser');

    // 2. Login with username
    const usernameLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'loginuser',
        password: 'password123',
      }),
    });
    const usernameLoginData = await usernameLoginRes.json();
    assert.strictEqual(usernameLoginRes.status, 200);
    assert.ok(usernameLoginData.token);
    assert.strictEqual(usernameLoginData.user.email, 'login@example.com');
  });

  test('POST /login - rejects invalid credentials', async () => {
    await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'secureuser',
        email: 'secure@example.com',
        password: 'password123',
      }),
    });

    // Wrong password
    const wrongPassRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'secureuser',
        password: 'wrongpassword',
      }),
    });
    assert.strictEqual(wrongPassRes.status, 401);

    // Non-existent user
    const nonExistentRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'nobody@example.com',
        password: 'password123',
      }),
    });
    assert.strictEqual(nonExistentRes.status, 401);
  });

  test('GET /me - returns current user profile when authenticated', async () => {
    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'profileuser',
        email: 'profile@example.com',
        password: 'password123',
        displayName: 'Profile Tester',
      }),
    });
    const { token } = await regRes.json();

    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();

    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meData.user.username, 'profileuser');
    assert.strictEqual(meData.user.email, 'profile@example.com');
    assert.strictEqual(meData.user.displayName, 'Profile Tester');
    assert.strictEqual(meData.user.karma, 0);
  });

  test('GET /me - rejects unauthenticated requests', async () => {
    // Missing token
    const noTokenRes = await fetch(`${baseUrl}/me`);
    assert.strictEqual(noTokenRes.status, 401);

    // Invalid token
    const badTokenRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: 'Bearer totally_invalid_token' },
    });
    assert.strictEqual(badTokenRes.status, 401);
  });

  test('POST /logout - returns successful logout response', async () => {
    const logoutRes = await fetch(`${baseUrl}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const logoutData = await logoutRes.json();

    assert.strictEqual(logoutRes.status, 200);
    assert.ok(logoutData.message.includes('success') || logoutData.message.includes('Logout'));
  });
});
