import { Router } from 'express';
import {
  createPost,
  getPost,
  updatePost,
  deletePost,
  votePost,
} from './post.controller.js';
import {
  createComment,
  getComments,
} from '../comments/comment.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, createPost);
router.get('/:id', optionalAuth, getPost);
router.put('/:id', requireAuth, updatePost);
router.delete('/:id', requireAuth, deletePost);
router.post('/:id/vote', requireAuth, votePost);

// Comments nested under post
router.post('/:postId/comments', requireAuth, createComment);
router.get('/:postId/comments', optionalAuth, getComments);

export default router;
