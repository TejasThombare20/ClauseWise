import { database, DocumentRow } from '../db/database.js';
import logger from '../config/logger.js';

export class DocumentRepository {
  async insertDocument(doc: DocumentRow): Promise<void> {
    const pool = database.getPool();
    await pool.query(
      `INSERT INTO documents (id, file_name, file_type, markdown_content, checksum, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [doc.id, doc.file_name, doc.file_type, doc.markdown_content, doc.checksum, doc.uploaded_at]
    );
    logger.info(`Inserted document: ${doc.file_name}`);
  }

  async findByFileAndChecksum(fileName: string, checksum: string): Promise<DocumentRow | null> {
    const pool = database.getPool();
    const { rows } = await pool.query(
      `SELECT id, file_name, file_type, markdown_content, checksum, uploaded_at
       FROM documents WHERE file_name = $1 AND checksum = $2 LIMIT 1`,
      [fileName, checksum]
    );
    return rows.length > 0 ? rows[0] : null;
  }
}

export const documentRepository = new DocumentRepository();
