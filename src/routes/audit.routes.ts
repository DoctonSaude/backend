import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// Registrar log de auditoria / atividade
router.post('/log', authenticate, async (req, res, next) => {
    try {
        const { action, section, details, severity, category, status, resource, resourceId, additionalData } = req.body;

        const log = await prisma.auditLog.create({
            data: {
                timestamp: new Date(),
                userId: req.user?.userId || null,
                userName: (req as any).user?.name || 'Usuário',
                userRole: (req as any).user?.role || 'UNKNOWN',
                action: action || 'UNKNOWN_ACTION',
                resource: resource || section || 'INTERFACE',
                resourceId: resourceId || null,
                ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1',
                severity: severity || 'low',
                category: category || 'user-action',
                status: status || 'success',
                details: {
                    details,
                    ...additionalData
                },
            },
        });

        res.status(201).json(log);
    } catch (error) {
        next(error);
    }
});

// Listar logs do próprio usuário (para o "Prontuário" ou "Timeline")
router.get('/my-activities', authenticate, async (req, res, next) => {
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                userId: req.user?.userId,
            },
            orderBy: {
                timestamp: 'desc',
            },
            take: 50,
        });
        res.json(logs);
    } catch (error) {
        next(error);
    }
});

export default router;
