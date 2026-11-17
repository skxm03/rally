import test from 'node:test';
import assert from 'node:assert/strict';

// Test post authoring client validation logic
function validatePostInputs({ title, content, hasImage, isMember }) {
  if (!isMember) {
    return { valid: false, error: 'You must join this community to post' };
  }
  const cleanTitle = title?.trim() || '';
  if (cleanTitle.length < 3 || cleanTitle.length > 300) {
    return { valid: false, error: 'Title must be between 3 and 300 characters' };
  }
  const cleanContent = content?.trim() || '';
  if (!cleanContent && !hasImage) {
    return { valid: false, error: 'Post must have either text content or an image' };
  }
  return { valid: true };
}

test('validatePostInputs requires community membership', () => {
  const result = validatePostInputs({
    title: 'Valid title',
    content: 'Valid content',
    hasImage: false,
    isMember: false,
  });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'You must join this community to post');
});

test('validatePostInputs validates title length', () => {
  assert.equal(
    validatePostInputs({ title: 'ab', content: 'body', hasImage: false, isMember: true }).valid,
    false
  );
  assert.equal(
    validatePostInputs({ title: '   ', content: 'body', hasImage: false, isMember: true }).valid,
    false
  );
  assert.equal(
    validatePostInputs({
      title: 'Valid post title',
      content: 'body text',
      hasImage: false,
      isMember: true,
    }).valid,
    true
  );
});

test('validatePostInputs accepts image with or without text content', () => {
  // Image only (valid)
  assert.equal(
    validatePostInputs({
      title: 'Photo title',
      content: '',
      hasImage: true,
      isMember: true,
    }).valid,
    true
  );

  // Neither text nor image (invalid)
  assert.equal(
    validatePostInputs({
      title: 'Photo title',
      content: '',
      hasImage: false,
      isMember: true,
    }).valid,
    false
  );
});

// Test author ownership check for edit/delete
function canUserManagePost(currentUserId, postAuthorId) {
  if (!currentUserId || !postAuthorId) return false;
  return currentUserId === postAuthorId;
}

test('canUserManagePost grants edit/delete strictly to the author', () => {
  assert.equal(canUserManagePost(42, 42), true);
  assert.equal(canUserManagePost(10, 42), false);
  assert.equal(canUserManagePost(null, 42), false);
});
