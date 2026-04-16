import { Pool } from 'pg';
import logger from '../config/logger.js';

export interface DocumentRow {
  id: string;
  file_name: string;
  file_type: string;
  markdown_content: string;
  checksum: string;
  uploaded_at: Date;
}

export interface ContractAnalysisRow {
  id: string;
  file_id: string;
  contract_name: string;
  key_name: string;
  content: string;
  created_at: Date;
}

export class Database {
  private pool: Pool | null = null;

  getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || '5432'),
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DATABASE,
      });

      this.pool.on('error', (err) => {
        logger.error(`Unexpected PostgreSQL pool error: ${err.message}`);
      });
    }

    return this.pool;
  }

  async initialize(): Promise<void> {
    const pool = this.getPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      logger.info('Database connected');
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

export const database = new Database();
