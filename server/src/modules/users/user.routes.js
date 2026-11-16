import { Router } from 'express';
import { getProfile, updateProfile } from './user.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';

const router = Router();

router.put('/profile', requireAuth, updateProfile);
router.get('/:username', optionalAuth, getProfile);

export default router;
