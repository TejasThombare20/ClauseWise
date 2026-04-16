import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import logger from '../config/logger.js';
import { documentParser, DocumentInfo } from './documentParser.js';
import { agentService } from './agentService.js';
import { contractRepository } from '../repositories/contractRepository.js';
import { documentRepository } from '../repositories/documentRepository.js';
import { ContractAnalysisRow, DocumentRow } from '../db/database.js';
import { AnalysisItem } from '../schemas/toolSchemas.js';

export interface AnalyzeResult {
  success: true;
  skipped: boolean;
  contractName?: string;
  results?: AnalysisItem[];
  message?: string;
}

export interface BatchResult {
  fileName: string;
  status: 'analyzed' | 'skipped' | 'failed';
  contractName?: string;
  error?: string;
}

export class ContractService {
  listDocuments(): DocumentInfo[] {
    return documentParser.listDocuments();
  }

  async analyzeSingleDocument(filePath: string): Promise<AnalyzeResult> {
    logger.info(`Analyze request for: ${filePath}`);

    const markdown = await documentParser.extractMarkdown(filePath);
    const checksum = documentParser.computeChecksum(markdown);

    const existingDoc = await documentRepository.findByFileAndChecksum(filePath, checksum);
    if (existingDoc) {
      logger.info(`Skipping ${filePath} — already analyzed with same checksum`);
      return { success: true, skipped: true, message: 'File already analyzed with same content' };
    }

    // Insert document record
    const docId = uuidv4();
    const docRow: DocumentRow = {
      id: docId,
      file_name: filePath,
      file_type: path.extname(filePath).replace('.', ''),
      markdown_content: markdown,
      checksum,
      uploaded_at: new Date(),
    };
    await documentRepository.insertDocument(docRow);

    // Analyze and insert contract analyses
    const analyses = await agentService.analyzeContract(markdown);

    const rows: ContractAnalysisRow[] = analyses.map((item) => ({
      id: uuidv4(),
      file_id: docId,
      contract_name: item.contract_name,
      key_name: item.key_name,
      content: item.content,
      created_at: new Date(),
    }));

    await contractRepository.insertAnalyses(rows);

    logger.info(`Analysis stored for contract: ${rows[0].contract_name}`);

    return {
      success: true,
      skipped: false,
      contractName: rows[0].contract_name,
      results: analyses,
    };
  }

  async batchAnalyze(): Promise<BatchResult[]> {
    const documents = documentParser.listDocuments();
    logger.info(`Batch analysis starting — ${documents.length} documents found`);

    const results: BatchResult[] = [];

    for (const doc of documents) {
      try {
        const markdown = await documentParser.extractMarkdown(doc.path);
        const checksum = documentParser.computeChecksum(markdown);

        const existingDoc = await documentRepository.findByFileAndChecksum(doc.path, checksum);
        if (existingDoc) {
          logger.info(`Skipping ${doc.path} — already analyzed with same checksum`);
          results.push({ fileName: doc.path, status: 'skipped' });
          continue;
        }

        // Insert document record
        const docId = uuidv4();
        const docRow: DocumentRow = {
          id: docId,
          file_name: doc.path,
          file_type: path.extname(doc.path).replace('.', ''),
          markdown_content: markdown,
          checksum,
          uploaded_at: new Date(),
        };
        await documentRepository.insertDocument(docRow);

        // Analyze and insert contract analyses
        const analyses = await agentService.analyzeContract(markdown);

        const rows: ContractAnalysisRow[] = analyses.map((item) => ({
          id: uuidv4(),
          file_id: docId,
          contract_name: item.contract_name,
          key_name: item.key_name,
          content: item.content,
          created_at: new Date(),
        }));

        await contractRepository.insertAnalyses(rows);

        results.push({
          fileName: doc.path,
          status: 'analyzed',
          contractName: analyses[0].contract_name,
        });

        logger.info(`Batch: analyzed ${doc.path} → ${analyses[0].contract_name}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Batch: failed to analyze ${doc.path}: ${message}`);
        results.push({ fileName: doc.path, status: 'failed', error: message });
      }
    }

    const analyzed = results.filter((r) => r.status === 'analyzed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    logger.info(`Batch analysis complete — analyzed: ${analyzed}, skipped: ${skipped}, failed: ${failed}`);

    return results;
  }

  async getContracts(): Promise<string[]> {
    return contractRepository.getContracts();
  }

  async getContractByName(contractName: string): Promise<ContractAnalysisRow[]> {
    return contractRepository.getContractByName(contractName);
  }
}

export const contractService = new ContractService();
