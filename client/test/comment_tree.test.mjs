import test from 'node:test';
import assert from 'node:assert/strict';

// Test tree update helper
function updateCommentInTree(list, commentId, modifier) {
  return list
    .map((node) => {
      if (node.id === commentId) {
        return modifier(node);
      }
      if (node.replies && node.replies.length > 0) {
        return {
          ...node,
          replies: updateCommentInTree(node.replies, commentId, modifier),
        };
      }
      return node;
    })
    .filter((n) => n !== null);
}

test('updateCommentInTree updates target nested comment text', () => {
  const tree = [
    {
      id: 1,
      content: 'Root comment',
      replies: [
        { id: 2, content: 'Child reply', replies: [] },
      ],
    },
  ];

  const updated = updateCommentInTree(tree, 2, (node) => ({
    ...node,
    content: 'Edited child reply',
  }));

  assert.equal(updated[0].replies[0].content, 'Edited child reply');
  assert.equal(updated[0].content, 'Root comment');
});

test('updateCommentInTree handles tombstone for comments with replies', () => {
  const tree = [
    {
      id: 1,
      content: 'Original comment',
      replies: [
        { id: 2, content: 'Reply to original', replies: [] },
      ],
    },
  ];

  const tombstoned = updateCommentInTree(tree, 1, (node) => ({
    ...node,
    content: '[deleted]',
    author: { id: null, username: '[deleted]', displayName: '[deleted]' },
  }));

  assert.equal(tombstoned[0].content, '[deleted]');
  assert.equal(tombstoned[0].author.username, '[deleted]');
  assert.equal(tombstoned[0].replies.length, 1);
});

test('updateCommentInTree hard deletes leaf comments', () => {
  const tree = [
    {
      id: 1,
      content: 'Root comment',
      replies: [
        { id: 2, content: 'Leaf comment to remove', replies: [] },
      ],
    },
  ];

  const pruned = updateCommentInTree(tree, 2, () => null);
  assert.equal(pruned[0].replies.length, 0);
});

// Test comment validation
function validateCommentContent(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  return clean.length >= 1 && clean.length <= 2000;
}

test('validateCommentContent enforces bounds', () => {
  assert.equal(validateCommentContent(''), false);
  assert.equal(validateCommentContent('   '), false);
  assert.equal(validateCommentContent('Great point!'), true);
  assert.equal(validateCommentContent('a'.repeat(2001)), false);
});
