import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './modules/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

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
