// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/validation-codes/stats
 */
router.get('/validation-codes/stats', ...adminAuth, async (req, res) => {
  try {
    const [total, valid, invalid, errorStatus] = await Promise.all([
      prisma.validationCodeLog.count(),
      prisma.validationCodeLog.count({ where: { status: 'valid' } }),
      prisma.validationCodeLog.count({ where: { status: 'invalid' } }),
      prisma.validationCodeLog.count({ where: { status: 'error' } })
    ]);

    return res.json({ total, valid, invalid, errorStatus });
  } catch (error) {
    console.error('Error fetching validation code stats:', error);
    res.json({ total: 0, valid: 0, invalid: 0, errorStatus: 0 });
  }
});

/**
 * @route GET /api/admin/validation-codes/logs
 */
router.get('/validation-codes/logs', ...adminAuth, async (req, res) => {
  const { page = 1, pageSize = 10, query, partnerId, status } = req.query;
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  try {
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (partnerId) where.partnerId = partnerId;
    if (query) {
      where.OR = [
        { code: { contains: String(query), mode: 'insensitive' } },
        { partnerName: { contains: String(query), mode: 'insensitive' } },
        { patientName: { contains: String(query), mode: 'insensitive' } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.validationCodeLog.findMany({
        where,
        skip,
        take,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.validationCodeLog.count({ where })
    ]);

    return res.json({
      logs,
      pagination: {
        total,
        totalPages: Math.ceil(total / take),
        page: Number(page),
        pageSize: take
      }
    });
  } catch (error) {
    console.error('Error fetching validation code logs:', error);
    res.json({ logs: [], pagination: { total: 0, totalPages: 1 } });
  }
});

/**
 * @route POST /api/admin/validation-codes/logs
 */
router.post('/validation-codes/logs', ...adminAuth, async (req, res) => {
  const body = req.body || {};
  try {
    const created = await prisma.validationCodeLog.create({
      data: {
        code: String(body.code || ''),
        status: String(body.status || 'valid'),
        partnerName: body.partnerName ? String(body.partnerName) : null,
        patientName: body.patientName ? String(body.patientName) : null,
        appointmentId: body.appointmentId ? String(body.appointmentId) : null,
        errorMessage: body.errorMessage ? String(body.errorMessage) : null,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        partnerId: body.partnerId ? String(body.partnerId) : null,
      }
    });
    return res.status(201).json(created);
  } catch (error) {
    console.error('Error creating validation code log:', error);
    res.status(500).json({ error: 'Erro ao criar log de validação' });
  }
});

/**
 * @route PUT /api/admin/validation-codes/logs/:id
 */
router.put('/validation-codes/logs/:id', ...adminAuth, async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  try {
    const updated = await prisma.validationCodeLog.update({
      where: { id },
      data: {
        ...(typeof body.code === 'string' ? { code: body.code } : {}),
        ...(typeof body.status === 'string' ? { status: body.status } : {}),
        ...(typeof body.partnerName === 'string' ? { partnerName: body.partnerName } : {}),
        ...(typeof body.patientName === 'string' ? { patientName: body.patientName } : {}),
        ...(typeof body.appointmentId === 'string' ? { appointmentId: body.appointmentId } : {}),
        ...(typeof body.errorMessage === 'string' ? { errorMessage: body.errorMessage } : {}),
        ...(body.timestamp ? { timestamp: new Date(body.timestamp) } : {}),
      }
    });
    return res.json(updated);
  } catch (error) {
    console.error('Error updating validation code log:', error);
    res.status(500).json({ error: 'Erro ao atualizar log de validação' });
  }
});

/**
 * @route DELETE /api/admin/validation-codes/logs/:id
 */
router.delete('/validation-codes/logs/:id', ...adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.validationCodeLog.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting validation code log:', error);
    res.status(500).json({ error: 'Erro ao excluir log de validação' });
  }
});

export default router;
