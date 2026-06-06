import { Router } from 'express';
import growthController from '../controllers/growth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Métricas detalhadas (Faturamento, ROI, LTV)
router.get('/metrics', authenticate, growthController.getMetrics);

// Insights IA (Oportunidades e Alertas)
router.get('/insights', authenticate, growthController.getInsights);

// Marketplace de Campanhas (Templates)
router.get('/templates', authenticate, growthController.getTemplates);
router.post('/templates', authenticate, growthController.createTemplate);
router.put('/templates/:id', authenticate, growthController.updateTemplate);
router.delete('/templates/:id', authenticate, growthController.deleteTemplate);

// Ativação de Campanha
router.post('/campaign/activate', authenticate, growthController.activateCampaign);

// Dados do CRM Inteligente
router.get('/crm-data', authenticate, growthController.getCRM);
router.post('/patients', authenticate, growthController.createPatient);

// Gestão de Campanhas (ROI e Investimentos)
router.get('/campaigns', authenticate, growthController.getCampaigns);
router.post('/campaigns', authenticate, growthController.createManualCampaign);
router.delete('/campaigns/:id', authenticate, growthController.deleteCampaign);

// [LEGACY] - Manter para compatibilidade com o dashboard de impulsos atual
router.get('/stats', authenticate, growthController.getStats);
router.post('/activate-boost', authenticate, growthController.activateBoost);
router.get('/boost-prices', authenticate, growthController.getBoostPrices);
router.post('/click/:partnerId', growthController.recordClick);

export default router;
