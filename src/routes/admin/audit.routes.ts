// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/audit/logs
 */
router.get('/audit/logs', ...adminAuth, async (req, res) => {
  try {
    const { category, severity, q, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (q) {
      where.OR = [
        { userName: { contains: String(q), mode: 'insensitive' } },
        { action: { contains: String(q), mode: 'insensitive' } },
        { resource: { contains: String(q), mode: 'insensitive' } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.json({ logs: [], total: 0 });
  }
});

/**
 * @route POST /api/admin/audit/logs/clear
 */
router.post('/audit/logs/clear', ...adminAuth, async (req, res) => {
  try {
    // Apenas admins master poderiam fazer isso em produção
    await prisma.auditLog.deleteMany({});
    return res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao limpar logs' });
  }
});

/**
 * @route DELETE /api/admin/audit/logs/:id
 */
router.delete('/audit/logs/:id', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.auditLog.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover log de auditoria' });
  }
});

export default router;
