import express from 'express';
import cors from 'cors';
import apiRouter from './modules/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome
app.get('/', (req, res) => {
  res.json({
    name: 'Rally API Server',
    status: 'running',
    health: '/api/health',
  });
});

// Mount modular API
app.use('/api', apiRouter);

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
