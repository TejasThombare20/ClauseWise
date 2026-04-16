import * as cron from 'node-cron';
import logger from '../config/logger.js';
import { contractService, BatchResult } from './contractService.js';

export class CronService {
  private task: cron.ScheduledTask | null = null;
  private running: boolean = false;
  private lastRunResults: BatchResult[] = [];
  private lastRunAt: Date | null = null;
  private cronExpression: string = '0 */6 * * *'; // every 6 hours

  isRunning(): boolean {
    return this.running;
  }

  isScheduled(): boolean {
    return this.task !== null;
  }

  getCronExpression(): string {
    return this.cronExpression;
  }

  getLastRunResults(): { results: BatchResult[]; runAt: Date | null } {
    return { results: this.lastRunResults, runAt: this.lastRunAt };
  }

  start(expression?: string): void {
    if (this.task) {
      this.task.stop();
    }

    if (expression) {
      if (!cron.validate(expression)) {
        throw new Error(`Invalid cron expression: ${expression}`);
      }
      this.cronExpression = expression;
    }

    this.task = cron.schedule(this.cronExpression, () => {
      this.runBatchAnalysis().catch((err) => {
        logger.error(`Scheduled batch analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    });

    logger.info(`Cron job scheduled: ${this.cronExpression}`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Cron job stopped');
    }
  }

  async runBatchAnalysis(): Promise<BatchResult[]> {
    if (this.running) {
      logger.warn('Batch analysis already in progress, skipping');
      return [];
    }

    this.running = true;

    try {
      const results = await contractService.batchAnalyze();
      this.lastRunResults = results;
      this.lastRunAt = new Date();
      return results;
    } finally {
      this.running = false;
    }
  }
}

export const cronService = new CronService();
