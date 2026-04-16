import { database, ContractAnalysisRow } from '../db/database.js';
import logger from '../config/logger.js';

export class ContractRepository {
  async insertAnalyses(analyses: ContractAnalysisRow[]): Promise<void> {
    const pool = database.getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of analyses) {
        await client.query(
          `INSERT INTO contract_analyses (id, file_id, contract_name, key_name, content)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (file_id, contract_name, key_name)
           DO UPDATE SET content = EXCLUDED.content, created_at = NOW()`,
          [item.id, item.file_id, item.contract_name, item.key_name, item.content]
        );
      }
      await client.query('COMMIT');
      logger.info(`Inserted/updated ${analyses.length} rows for contract: ${analyses[0]?.contract_name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to insert analyses: ${message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  async getContracts(): Promise<string[]> {
    const pool = database.getPool();
    const { rows } = await pool.query(
      `SELECT DISTINCT contract_name FROM contract_analyses ORDER BY contract_name`
    );
    return rows.map((r: { contract_name: string }) => r.contract_name);
  }

  async getContractByName(contractName: string): Promise<ContractAnalysisRow[]> {
    const pool = database.getPool();
    const { rows } = await pool.query(
      `SELECT id, file_id, contract_name, key_name, content, created_at
       FROM contract_analyses
       WHERE contract_name = $1
       ORDER BY key_name`,
      [contractName]
    );
    return rows;
  }
}

export const contractRepository = new ContractRepository();
