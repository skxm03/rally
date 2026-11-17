import test from 'node:test';
import assert from 'node:assert/strict';

// Test profile update validation
function validateProfileInputs({ displayName, bio }) {
  if (displayName !== undefined && displayName !== null) {
    if (typeof displayName !== 'string' || displayName.trim().length > 100) {
      return { valid: false, error: 'Display name must not exceed 100 characters' };
    }
  }
  if (bio !== undefined && bio !== null) {
    if (typeof bio !== 'string' || bio.trim().length > 500) {
      return { valid: false, error: 'Bio must not exceed 500 characters' };
    }
  }
  return { valid: true };
}

test('validateProfileInputs enforces length bounds', () => {
  assert.equal(validateProfileInputs({ displayName: 'Alex', bio: 'Hello' }).valid, true);
  assert.equal(validateProfileInputs({ displayName: 'a'.repeat(101), bio: '' }).valid, false);
  assert.equal(validateProfileInputs({ displayName: 'Alex', bio: 'b'.repeat(501) }).valid, false);
});

// Test search query handling
function buildSearchEndpoint(q, type, page = 1, limit = 15) {
  const clean = q.trim();
  if (!clean) return null;
  const params = new URLSearchParams({ q: clean, type });
  if (type !== 'all') {
    params.append('page', String(page));
    params.append('limit', String(limit));
  }
  return `/search?${params.toString()}`;
}

test('buildSearchEndpoint generates correct query strings', () => {
  assert.equal(
    buildSearchEndpoint('tech', 'all'),
    '/search?q=tech&type=all'
  );
  assert.equal(
    buildSearchEndpoint('react', 'posts', 2, 10),
    '/search?q=react&type=posts&page=2&limit=10'
  );
  assert.equal(buildSearchEndpoint('   ', 'all'), null);
});
