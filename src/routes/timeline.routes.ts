import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { patientService } from '../services/patient.service.js';
import { logger } from '../lib/logger.js';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * Valida a permissão do usuário atual (requesterId) sobre o paciente alvo (targetUserId)
 */
async function validateAccess(requesterId: string, targetUserId: string): Promise<boolean> {
    if (requesterId === targetUserId) return true;

    try {
        const requester = await prisma.patient.findUnique({
            where: { userId: requesterId },
            select: { familyRole: true, familyGroupId: true }
        });

        if (!requester || requester.familyRole !== 'HEAD' || !requester.familyGroupId) {
            return false;
        }

        const target = await prisma.patient.findUnique({
            where: { userId: targetUserId },
            select: { familyGroupId: true }
        });

        if (!target || target.familyGroupId !== requester.familyGroupId) {
            return false;
        }

        return true;
    } catch (error) {
        logger.error('[Timeline Routes] Erro de validação de família:', error);
        return false;
    }
}

/**
 * GET /api/patient/timeline
 * Retorna a timeline médica consolidada do paciente autenticado ou seu dependente
 */
router.get('/', authenticate, authorize('PATIENT'), async (req, res) => {
    try {
        const requesterId = req.user!.userId;
        const targetUserId = (req.query.patientId as string) || requesterId;

        const hasAccess = await validateAccess(requesterId, targetUserId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acesso negado ao histórico deste paciente' });
        }

        const timeline = await patientService.getMedicalTimeline(targetUserId);
        res.json(timeline);
    } catch (error) {
        logger.error('[Timeline Routes] Erro ao buscar timeline:', error);
        res.status(500).json({ error: 'Erro ao carregar timeline de saúde' });
    }
});

/**
 * POST /api/patient/timeline/refresh
 * Invalida o cache e força a atualização da timeline do paciente
 */
router.post('/refresh', authenticate, authorize('PATIENT'), async (req, res) => {
    try {
        const requesterId = req.user!.userId;
        const targetUserId = (req.query.patientId as string) || requesterId;

        const hasAccess = await validateAccess(requesterId, targetUserId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acesso negado ao histórico deste paciente' });
        }

        await patientService.invalidateTimeline(targetUserId);
        const timeline = await patientService.getMedicalTimeline(targetUserId);
        res.json(timeline);
    } catch (error) {
        logger.error('[Timeline Routes] Erro ao atualizar timeline:', error);
        res.status(500).json({ error: 'Erro ao atualizar timeline de saúde' });
    }
});

export default router;
