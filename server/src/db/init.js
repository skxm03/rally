import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDb() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Applying schema to PostgreSQL database...');
    await pool.query(sql);
    console.log('✅ Database schema initialized successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to initialize database schema:', err);
    process.exit(1);
  }
}

initDb();
