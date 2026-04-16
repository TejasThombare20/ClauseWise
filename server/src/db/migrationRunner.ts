import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger.js';

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

export async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version   INTEGER PRIMARY KEY,
        name      TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const { rows } = await client.query(`SELECT version FROM schema_migrations ORDER BY version`);
    const applied = new Set(rows.map((r: { version: number }) => r.version));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = parseInt(file?.split('_')[0], 10);
      const name = file.replace('.sql', '');

      if (applied.has(version)) {
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

      logger.info(`Running migration ${version}: ${name}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations (version, name) VALUES ($1, $2)`,
          [version, name]
        );
        await client.query('COMMIT');
        logger.info(`Migration ${version} applied`);
      } catch (err) {
        await client.query('ROLLBACK');
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Migration ${version} failed: ${message}`);
        throw err;
      }
    }

    logger.info('All migrations up to date');
  } finally {
    client.release();
  }
}
