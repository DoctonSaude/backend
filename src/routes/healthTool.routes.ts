import { Router } from 'express';
import healthToolController from '../controllers/healthTool.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Todas as rotas de ferramentas de saúde exigem autenticação
router.post('/analyze-symptoms', authenticate, healthToolController.analyzeSymptoms);
router.post('/check-interactions', authenticate, healthToolController.checkInteractions);
router.get('/history', authenticate, healthToolController.getHistory);
router.post('/save-calculation', authenticate, healthToolController.saveCalculation);

export default router;
