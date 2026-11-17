import test from 'node:test';
import assert from 'node:assert/strict';

// Test community name validator rule
function validateCommunityName(name) {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim().toLowerCase();
  const regex = /^[a-z0-9_]{3,30}$/;
  return regex.test(clean);
}

test('validateCommunityName accepts valid alphanumeric names', () => {
  assert.equal(validateCommunityName('reactnative'), true);
  assert.equal(validateCommunityName('tech_news'), true);
  assert.equal(validateCommunityName('dev123'), true);
});

test('validateCommunityName rejects invalid names', () => {
  assert.equal(validateCommunityName('ab'), false); // too short
  assert.equal(validateCommunityName('this_is_way_too_long_for_a_community_name_exceeding_30_chars'), false); // too long
  assert.equal(validateCommunityName('hello world'), false); // spaces not allowed
  assert.equal(validateCommunityName('react-native'), false); // hyphens not allowed
});

// Test membership state transition calculation
function computeMembershipTransition(currentIsMember, currentCount) {
  const nextIsMember = !currentIsMember;
  const nextCount = nextIsMember ? currentCount + 1 : Math.max(0, currentCount - 1);
  return { nextIsMember, nextCount };
}

test('computeMembershipTransition joins community and increments count', () => {
  const result = computeMembershipTransition(false, 5);
  assert.equal(result.nextIsMember, true);
  assert.equal(result.nextCount, 6);
});

test('computeMembershipTransition leaves community and decrements count', () => {
  const result = computeMembershipTransition(true, 5);
  assert.equal(result.nextIsMember, false);
  assert.equal(result.nextCount, 4);
});

test('computeMembershipTransition does not drop count below 0', () => {
  const result = computeMembershipTransition(true, 0);
  assert.equal(result.nextIsMember, false);
  assert.equal(result.nextCount, 0);
});
