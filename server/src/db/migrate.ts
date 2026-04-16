import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { runMigrations } from './migrationRunner.js';

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function main() {
  try {
    await runMigrations(pool);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
