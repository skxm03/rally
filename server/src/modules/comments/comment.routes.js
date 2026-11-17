import { Router } from 'express';
import {
  updateComment,
  deleteComment,
  voteComment,
} from './comment.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.put('/:id', requireAuth, updateComment);
router.delete('/:id', requireAuth, deleteComment);
router.post('/:id/vote', requireAuth, voteComment);

export default router;
