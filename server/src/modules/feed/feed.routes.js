import { Router } from 'express';
import { getFeed, getPopular } from './feed.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getFeed);
router.get('/popular', optionalAuth, getPopular);

export default router;
