import { Router } from 'express';
import growthController from '../controllers/growth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Estatísticas de crescimento (Apenas para o parceiro autenticado)
router.get('/stats', authenticate, growthController.getStats);

// Ativação de Boost (Apenas parceiros)
router.post('/activate-boost', authenticate, growthController.activateBoost);

// Registro de Clique (Público - chamado quando um paciente clica no perfil)
router.post('/click/:partnerId', growthController.recordClick);

export default router;
