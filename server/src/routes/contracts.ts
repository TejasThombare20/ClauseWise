import { Router } from 'express';
import { contractController } from '../controllers/contractController.js';

const router = Router();

// Document listing
router.get('/documents', (req, res) => contractController.listDocuments(req, res));

// Analysis
router.post('/analyze', (req, res) => contractController.analyzeSingle(req, res));
router.post('/analyze/batch', (req, res) => contractController.analyzeBatch(req, res));
router.get('/analyze/status', (req, res) => contractController.getAnalyzeStatus(req, res));

// Cron management
router.post('/cron/start', (req, res) => contractController.startCron(req, res));
router.post('/cron/stop', (req, res) => contractController.stopCron(req, res));

// Contract results
router.get('/contracts', (req, res) => contractController.getContracts(req, res));
router.get('/contracts/:name', (req, res) => contractController.getContractByName(req, res));

export default router;
