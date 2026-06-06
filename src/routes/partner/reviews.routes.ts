// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { reputationService } from '../../services/reputation.service.js';

const router = Router();

/**
 * @route GET /api/partners/reputation/reviews
 */
router.get('/reputation/reviews', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const reviews = await reputationService.getPartnerReviews(partner.id);
    return res.json(reviews);
  } catch (error: any) {
    console.error('[Partner Reviews] Erro ao listar:', error);
    return res.status(500).json({ error: 'Erro ao listar avaliações', details: error?.message });
  }
});

/**
 * @route GET /api/partners/reputation/stats
 */
router.get('/reputation/stats', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });
    
    const stats = await reputationService.getReputationStats(partner.id);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route POST /api/partners/reputation/reviews/:reviewId/reply
 */
router.post('/reputation/reviews/:reviewId/reply', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { reply } = req.body;
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const updatedReview = await reputationService.replyToReview(req.params.reviewId, partner.id, reply);
    res.json(updatedReview);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
