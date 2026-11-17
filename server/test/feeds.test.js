import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import pool from '../src/config/db.js';

describe('Feeds, Sorting, Pagination, and Search API (Phase 5)', () => {
  let server;
  let feedUrl;
  let commUrl;
  let postsUrl;
  let searchUrl;
  let authUrl;

  let userA, tokenA;
  let userB, tokenB;
  let commTech, commArt;
  let post1, post2, post3, post4;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        feedUrl = `http://localhost:${port}/api/feed`;
        commUrl = `http://localhost:${port}/api/communities`;
        postsUrl = `http://localhost:${port}/api/posts`;
        searchUrl = `http://localhost:${port}/api/search`;
        authUrl = `http://localhost:${port}/api/auth`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.query('DELETE FROM posts');
    await pool.query('DELETE FROM communities');
    await pool.query("DELETE FROM users WHERE email LIKE '%@feedtest.com'");
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM posts');
    await pool.query('DELETE FROM communities');
    await pool.query("DELETE FROM users WHERE email LIKE '%@feedtest.com'");

    // 1. Register User A
    const resA = await fetch(`${authUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice_feeds',
        email: 'alice@feedtest.com',
        password: 'password123',
        displayName: 'Alice Architect',
      }),
    });
    const dataA = await resA.json();
    userA = dataA.user;
    tokenA = dataA.token;

    // 2. Register User B
    const resB = await fetch(`${authUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'bob_feeds',
        email: 'bob@feedtest.com',
        password: 'password123',
        displayName: 'Bob Builder',
      }),
    });
    const dataB = await resB.json();
    userB = dataB.user;
    tokenB = dataB.token;

    // 3. User A creates 'technology' community (Alice is automatically member)
    const commRes1 = await fetch(`${commUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'technology',
        description: 'All about tech and programming',
      }),
    });
    const commData1 = await commRes1.json();
    commTech = commData1.community;

    // 4. User B creates 'digitalart' community (Bob is automatically member)
    const commRes2 = await fetch(`${commUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        name: 'digitalart',
        description: 'Digital art design showcase',
      }),
    });
    const commData2 = await commRes2.json();
    commArt = commData2.community;

    // 5. Create Posts
    // Post 1 in Technology by Alice
    const p1Res = await fetch(`${postsUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        communityId: commTech.id,
        title: 'Node.js 22 and PostgreSQL Tech Performance',
        content: 'Analyzing deep backend concurrency patterns.',
      }),
    });
    post1 = (await p1Res.json()).post;

    // Post 2 in Technology by Alice
    const p2Res = await fetch(`${postsUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        communityId: commTech.id,
        title: 'React Native Architecture in 2026',
        content: 'Exploring Expo routing and state.',
      }),
    });
    post2 = (await p2Res.json()).post;

    // Post 3 in DigitalArt by Bob
    const p3Res = await fetch(`${postsUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        communityId: commArt.id,
        title: 'Generative Art with Shaders',
        content: 'Visualizing algorithms on canvas.',
      }),
    });
    post3 = (await p3Res.json()).post;

    // User A upvotes post 1 so it has score 1
    await fetch(`${postsUrl}/${post1.id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ voteValue: 1 }),
    });
  });

  // --- SLICE 1: Feeds (Home vs Popular vs Community) ---
  test('GET /api/feed - guest (unauthenticated) gets popular feed', async () => {
    const res = await fetch(`${feedUrl}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.posts));
    assert.strictEqual(data.posts.length, 3);
    assert.ok(data.pagination);
    assert.strictEqual(data.pagination.total, 3);
  });

  test('GET /api/feed - authenticated user receives personalized feed of joined communities', async () => {
    // Alice is only in 'technology', so should see only post1 and post2, not post3
    const res = await fetch(`${feedUrl}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.posts.length, 2);
    const titles = data.posts.map((p) => p.title);
    assert.ok(titles.includes('Node.js 22 and PostgreSQL Tech Performance'));
    assert.ok(titles.includes('React Native Architecture in 2026'));
    assert.ok(!titles.includes('Generative Art with Shaders'));
  });

  test('GET /api/feed - authenticated user with 0 joined communities falls back to popular feed', async () => {
    // Register User C with 0 joined communities
    const resC = await fetch(`${authUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'charlie_new',
        email: 'charlie@feedtest.com',
        password: 'password123',
        displayName: 'Charlie New',
      }),
    });
    const { token: tokenC } = await resC.json();

    const res = await fetch(`${feedUrl}`, {
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    // Fallback gives all 3 posts
    assert.strictEqual(data.posts.length, 3);
  });

  test('GET /api/feed/popular - returns global posts regardless of user memberships', async () => {
    const res = await fetch(`${feedUrl}/popular`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.posts.length, 3);
  });

  test('GET /api/communities/:name/posts - returns only posts for that specific community', async () => {
    const res = await fetch(`${commUrl}/technology/posts`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.posts.length, 2);
    data.posts.forEach((p) => {
      assert.strictEqual(p.community.name, 'technology');
    });
  });

  // --- SLICE 2: Sorting and Pagination ---
  test('GET /api/feed - supports sort=top, sort=new, and sort=trending', async () => {
    // post1 has score 1, post2 and post3 have score 0
    const resTop = await fetch(`${feedUrl}/popular?sort=top`);
    const dataTop = await resTop.json();
    assert.strictEqual(dataTop.posts[0].id, post1.id);
    assert.strictEqual(dataTop.posts[0].score, 1);

    const resNew = await fetch(`${feedUrl}/popular?sort=new`);
    const dataNew = await resNew.json();
    // Latest created post is post3
    assert.strictEqual(dataNew.posts[0].id, post3.id);

    const resTrending = await fetch(`${feedUrl}/popular?sort=trending`);
    assert.strictEqual(resTrending.status, 200);
    const dataTrending = await resTrending.json();
    assert.ok(dataTrending.posts.length > 0);
  });

  test('GET /api/feed - respects page and limit pagination metadata', async () => {
    const res = await fetch(`${feedUrl}/popular?page=1&limit=2`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.posts.length, 2);
    assert.strictEqual(data.pagination.page, 1);
    assert.strictEqual(data.pagination.limit, 2);
    assert.strictEqual(data.pagination.total, 3);
    assert.strictEqual(data.pagination.totalPages, 2);
    assert.strictEqual(data.pagination.hasMore, true);

    const resPage2 = await fetch(`${feedUrl}/popular?page=2&limit=2`);
    const dataPage2 = await resPage2.json();
    assert.strictEqual(dataPage2.posts.length, 1);
    assert.strictEqual(dataPage2.pagination.page, 2);
    assert.strictEqual(dataPage2.pagination.hasMore, false);
  });

  // --- SLICE 3: Search (Users, Communities, Posts) ---
  test('GET /api/search - rejects empty or missing query parameter with 400', async () => {
    const resMissing = await fetch(`${searchUrl}`);
    assert.strictEqual(resMissing.status, 400);

    const resEmpty = await fetch(`${searchUrl}?q=   `);
    assert.strictEqual(resEmpty.status, 400);
  });

  test('GET /api/search - returns aggregated results when type=all', async () => {
    // 'tech' should match user Alice Architect (bio/username if matching) or community 'technology' or posts
    const res = await fetch(`${searchUrl}?q=tech`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.ok(data.communities);
    assert.ok(data.posts);
    assert.ok(data.users);

    assert.ok(data.communities.some((c) => c.name === 'technology'));
    assert.ok(data.posts.some((p) => p.title.toLowerCase().includes('tech')));
  });

  test('GET /api/search - returns filtered and paginated results for type=posts, communities, users', async () => {
    // Search posts
    const resPosts = await fetch(`${searchUrl}?q=React&type=posts`);
    assert.strictEqual(resPosts.status, 200);
    const dataPosts = await resPosts.json();
    assert.ok(Array.isArray(dataPosts.posts));
    assert.strictEqual(dataPosts.posts.length, 1);
    assert.strictEqual(dataPosts.posts[0].title, 'React Native Architecture in 2026');
    assert.ok(dataPosts.pagination);

    // Search communities
    const resComm = await fetch(`${searchUrl}?q=art&type=communities`);
    assert.strictEqual(resComm.status, 200);
    const dataComm = await resComm.json();
    assert.strictEqual(dataComm.communities.length, 1);
    assert.strictEqual(dataComm.communities[0].name, 'digitalart');

    // Search users
    const resUsers = await fetch(`${searchUrl}?q=alice&type=users`);
    assert.strictEqual(resUsers.status, 200);
    const dataUsers = await resUsers.json();
    assert.strictEqual(dataUsers.users.length, 1);
    assert.strictEqual(dataUsers.users[0].username, 'alice_feeds');
  });
});
