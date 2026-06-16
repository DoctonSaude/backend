// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import notificationService from '../../services/notification.service.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/challenges
 */
router.get('/challenges', ...adminAuth, async (req, res) => {
  try {
    const list = await prisma.challenge.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar desafios' });
  }
});

/**
 * @route POST /api/admin/challenges
 */
router.post('/challenges', ...adminAuth, async (req, res) => {
  try {
    const b = req.body;
    const created = await prisma.challenge.create({
      data: {
        title: b.title,
        description: b.description,
        type: b.type || 'DAILY',
        points: b.points || 0,
        category: b.category || 'Geral',
        status: b.status || 'Ativo',
        isActive: b.status === 'Ativo',
        sponsor: b.sponsor || 'Docton',
        startDate: b.startDate ? new Date(b.startDate) : null,
        endDate: b.endDate ? new Date(b.endDate) : null,
        approvalStatus: 'approved',
        createdBy: 'Admin'
      }
    });

    if (created.status === 'Ativo') {
       // Notificação básica (exemplo)
       notificationService.sendBulkPushNotifications(['*'], { title: 'Novo Desafio!', body: created.title }).catch(() => {});
    }

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar desafio' });
  }
});

/**
 * @route PUT /api/admin/challenges/:id
 */
router.put('/challenges/:id', ...adminAuth, async (req, res) => {
  try {
    const b = req.body;
    const updated = await prisma.challenge.update({
      where: { id: req.params.id },
      data: {
        title: b.title,
        description: b.description,
        type: b.type,
        points: b.points ? Number(b.points) : undefined,
        category: b.category,
        status: b.status,
        isActive: b.status ? b.status === 'Ativo' : undefined,
        sponsor: b.sponsor,
        startDate: b.startDate ? new Date(b.startDate) : undefined,
        endDate: b.endDate ? new Date(b.endDate) : undefined,
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar desafio' });
  }
});

/**
 * @route DELETE /api/admin/challenges/:id
 * @desc Deleta um desafio do sistema (Forçando trigger no Railway)
 */
router.delete('/challenges/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.challenge.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar desafio' });
  }
});

export default router;
