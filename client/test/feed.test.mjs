import test from 'node:test';
import assert from 'node:assert/strict';

// Test voting score calculation rules
function computeVoteTransition(previousVote, previousScore, targetVote) {
  let nextVote = targetVote;
  let delta = 0;

  if (previousVote === targetVote) {
    nextVote = 0;
    delta = -targetVote;
  } else if (previousVote === 0) {
    delta = targetVote;
  } else {
    delta = targetVote * 2;
  }

  return {
    nextScore: previousScore + delta,
    nextVote,
  };
}

test('computeVoteTransition handles fresh upvote', () => {
  const result = computeVoteTransition(0, 10, 1);
  assert.equal(result.nextVote, 1);
  assert.equal(result.nextScore, 11);
});

test('computeVoteTransition handles toggle off upvote', () => {
  const result = computeVoteTransition(1, 11, 1);
  assert.equal(result.nextVote, 0);
  assert.equal(result.nextScore, 10);
});

test('computeVoteTransition handles switching downvote to upvote', () => {
  const result = computeVoteTransition(-1, 9, 1);
  assert.equal(result.nextVote, 1);
  assert.equal(result.nextScore, 11);
});

test('computeVoteTransition handles switching upvote to downvote', () => {
  const result = computeVoteTransition(1, 11, -1);
  assert.equal(result.nextVote, -1);
  assert.equal(result.nextScore, 9);
});

// Test media URL resolution
function resolveMediaUrl(baseUrl, mediaPath) {
  if (!mediaPath) return null;
  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
    return mediaPath;
  }
  const origin = baseUrl.replace(/\/api$/, '');
  const cleanPath = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`;
  return `${origin}${cleanPath}`;
}

test('resolveMediaUrl correctly formats static uploaded paths', () => {
  const resolved = resolveMediaUrl('http://localhost:5001/api', '/uploads/photo.jpg');
  assert.equal(resolved, 'http://localhost:5001/uploads/photo.jpg');
});

test('resolveMediaUrl preserves absolute external URLs', () => {
  const resolved = resolveMediaUrl('http://localhost:5001/api', 'https://cdn.example.com/image.png');
  assert.equal(resolved, 'https://cdn.example.com/image.png');
});

test('resolveMediaUrl returns null on empty input', () => {
  assert.equal(resolveMediaUrl('http://localhost:5001/api', null), null);
  assert.equal(resolveMediaUrl('http://localhost:5001/api', undefined), null);
});
