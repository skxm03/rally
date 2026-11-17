import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import userRoutes from './users/user.routes.js';
import communityRoutes from './communities/community.routes.js';
import uploadRoutes from './upload/upload.routes.js';
import postRoutes from './posts/post.routes.js';
import commentRoutes from './comments/comment.routes.js';
import feedRoutes from './feed/feed.routes.js';
import searchRoutes from './search/search.routes.js';

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
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/posts', postRoutes);
apiRouter.use('/comments', commentRoutes);
apiRouter.use('/feed', feedRoutes);
apiRouter.use('/search', searchRoutes);

export default apiRouter;
