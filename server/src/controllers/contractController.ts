import { Request, Response } from 'express';
import logger from '../config/logger.js';
import { contractService } from '../services/contractService.js';
import { cronService } from '../services/cronService.js';

export class ContractController {
  listDocuments(req: Request, res: Response): void {
    try {
      const documents = contractService.listDocuments();
      logger.info(`Listed ${documents.length} documents`);
      res.json({ documents });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to list documents: ${message}`);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  }

  async analyzeSingle(req: Request, res: Response): Promise<void> {
    const { filePath } = req.body;

    if (!filePath) {
      res.status(400).json({ error: 'filePath is required' });
      return;
    }

    try {
      const result = await contractService.analyzeSingleDocument(filePath);

      if (result.skipped) {
        res.json({ success: true, skipped: true, message: result.message });
        return;
      }

      res.json({
        success: true,
        contractName: result.contractName,
        results: result.results,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Analysis failed for ${filePath}: ${message}`);
      res.status(500).json({ error: `Analysis failed: ${message}` });
    }
  }

  async analyzeBatch(req: Request, res: Response): Promise<void> {
    if (cronService.isRunning()) {
      res.status(409).json({ error: 'Batch analysis already in progress' });
      return;
    }

    cronService.runBatchAnalysis().catch((err) => {
      logger.error(`Manual batch analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    res.json({ success: true, message: 'Batch analysis started' });
  }

  getAnalyzeStatus(req: Request, res: Response): void {
    const { results, runAt } = cronService.getLastRunResults();
    res.json({
      running: cronService.isRunning(),
      scheduled: cronService.isScheduled(),
      cronExpression: cronService.getCronExpression(),
      lastRunAt: runAt,
      lastRunResults: results,
    });
  }

  startCron(req: Request, res: Response): void {
    try {
      const { expression } = req.body;
      cronService.start(expression);
      res.json({ success: true, cronExpression: cronService.getCronExpression() });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: message });
    }
  }

  stopCron(req: Request, res: Response): void {
    cronService.stop();
    res.json({ success: true, message: 'Cron job stopped' });
  }

  async getContracts(req: Request, res: Response): Promise<void> {
    try {
      const contracts = await contractService.getContracts();
      res.json({ contracts });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to fetch contracts: ${message}`);
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  }

  async getContractByName(req: Request<{ name: string }>, res: Response): Promise<void> {
    try {
      const contractName = decodeURIComponent(req.params.name);
      const keys = await contractService.getContractByName(contractName);

      if (keys.length === 0) {
        res.status(404).json({ error: 'Contract not found' });
        return;
      }

      res.json({ contractName, keys });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to fetch contract "${req.params.name}": ${message}`);
      res.status(500).json({ error: 'Failed to fetch contract details' });
    }
  }
}

export const contractController = new ContractController();
