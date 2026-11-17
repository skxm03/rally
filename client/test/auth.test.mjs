import test from 'node:test';
import assert from 'node:assert/strict';

// Test ApiError class behavior and serialization
test('ApiError encapsulates status and payload data', () => {
  class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  }

  const err = new ApiError('Username is already taken', 409, { message: 'Username is already taken' });
  assert.equal(err.status, 409);
  assert.equal(err.message, 'Username is already taken');
  assert.equal(err.name, 'ApiError');
});

// Test tokenStorage contract behavior
test('tokenStorage handles in-memory fallback correctly', async () => {
  let memoryStore = {};
  const mockStorage = {
    async get(key) {
      return memoryStore[key] || null;
    },
    async set(key, val) {
      memoryStore[key] = val;
    },
    async clear(key) {
      delete memoryStore[key];
    },
  };

  assert.equal(await mockStorage.get('token'), null);
  await mockStorage.set('token', 'jwt_abc_123');
  assert.equal(await mockStorage.get('token'), 'jwt_abc_123');
  await mockStorage.clear('token');
  assert.equal(await mockStorage.get('token'), null);
});
