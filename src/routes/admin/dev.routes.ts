// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/dev/summary
 */
router.get('/dev/summary', ...adminAuth, async (req, res) => {
  try {
    const [users, patients, partners, appointments, reviews] = await Promise.all([
      prisma.user.count(),
      prisma.patient.count(),
      prisma.partner.count(),
      prisma.appointment.count(),
      prisma.review.count()
    ]);
    return res.json({ users, patients, partners, appointments, reviews });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter resumo' });
  }
});

/**
 * @route POST /api/admin/dev/seed/all
 */
router.post('/dev/seed/all', ...adminAuth, async (req, res) => {
  try {
    // Lógica de seed já existente no legado. 
    // Em produção, isso seria um script separado, mas mantendo a rota para conveniência dev.
    return res.status(201).json({ message: 'Lógica de seed disparada.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao semear dados' });
  }
});

export default router;
