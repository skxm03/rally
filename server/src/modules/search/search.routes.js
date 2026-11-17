import { Router } from 'express';
import { search } from './search.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, search);

export default router;
