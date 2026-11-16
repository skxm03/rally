import { Router } from 'express';
import {
  createCommunity,
  getCommunities,
  getCommunityByName,
  joinCommunity,
  leaveCommunity,
} from './community.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getCommunities);
router.post('/', requireAuth, createCommunity);
router.get('/:name', optionalAuth, getCommunityByName);
router.post('/:id/join', requireAuth, joinCommunity);
router.post('/:id/leave', requireAuth, leaveCommunity);

export default router;
