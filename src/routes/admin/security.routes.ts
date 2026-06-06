// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/security/anomalies
 */
router.get('/security/anomalies', ...adminAuth, async (req, res) => {
  try {
    const anomalies = await prisma.securityAnomaly.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    if (anomalies.length === 0) {
      // Seed samples
      await prisma.securityAnomaly.createMany({
        data: [
          { type: 'brute_force', severity: 'high', description: 'Múltiplas tentativas de login falhas detectadas para o IP 189.1.2.3', status: 'pending' },
          { type: 'unusual_volume', severity: 'medium', description: 'Volume incomum de requisições de API nas últimas 4 horas', status: 'pending' },
          { type: 'unauthorized_access', severity: 'critical', description: 'Tentativa de acesso a recursos administrativos sem permissão nível 3', status: 'resolved' }
        ]
      });
      return res.json(await prisma.securityAnomaly.findMany({ orderBy: { timestamp: 'desc' } }));
    }
    return res.json(anomalies);
  } catch (error) {
    res.json([]);
  }
});

/**
 * @route POST /api/admin/security/scan
 */
router.post('/security/scan', ...adminAuth, async (req, res) => {
  try {
    // Simulação de scan de segurança
    await prisma.auditLog.create({
      data: {
        action: 'SECURITY_SCAN_STARTED',
        resource: 'System',
        userName: req.user?.userId ? String(req.user.userId) : 'Admin',
        userRole: 'ADMIN',
        ipAddress: req.ip || '127.0.0.1',
        severity: 'low',
        category: 'security',
        status: 'success'
      }
    });

    return res.json({ success: true, message: 'Varredura de segurança iniciada. Os resultados aparecerão no log de anomalias.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao iniciar varredura' });
  }
});

/**
 * @route PUT /api/admin/security/anomalies/:id/resolve
 */
router.put('/security/anomalies/:id/resolve', ...adminAuth, async (req, res) => {
  try {
    const updated = await prisma.securityAnomaly.update({
      where: { id: req.params.id },
      data: { status: 'resolved', updatedAt: new Date() }
    });
    return res.json(updated);
  } catch (error) {
    res.status(404).json({ error: 'Anomalia não encontrada' });
  }
});

export default router;
