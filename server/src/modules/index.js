import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import userRoutes from './users/user.routes.js';
import communityRoutes from './communities/community.routes.js';

const apiRouter = Router();

// Health check
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Rally API is live and healthy',
    timestamp: new Date().toISOString(),
  });
});

// Mount modules
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/communities', communityRoutes);

export default apiRouter;
