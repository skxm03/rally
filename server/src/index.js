import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Rally Server listening on port ${PORT}`);
  console.log(`📡 Health check available at http://localhost:${PORT}/api/health`);
});
