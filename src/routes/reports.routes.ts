import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), async (_req, res) => {
  try {
    const items = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(items);
  } catch (error) {
    console.error('Erro ao listar relatórios:', error);
    return res.status(500).json({ error: 'Erro ao listar relatórios' });
  }
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, type, format, periodStart, periodEnd, createdBy } = req.body || {};

    if (!name || !type || !format || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    const period = `${String(periodStart)} - ${String(periodEnd)}`;

    const report = await prisma.report.create({
      data: {
        name: String(name),
        type: String(type),
        format: String(format),
        status: 'READY',
        createdBy: String(createdBy || 'system'),
        period,
        size: '0 KB',
        downloads: 0,
      }
    });

    return res.status(201).json(report);
  } catch (error) {
    console.error('Erro ao criar relatório:', error);
    return res.status(500).json({ error: 'Erro ao criar relatório' });
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.report.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir relatório:', error);
    return res.status(500).json({ error: 'Erro ao excluir relatório' });
  }
});

router.patch('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};

    const downloadsIncrement = patch?.downloads?.increment;

    const report = await prisma.report.update({
      where: { id },
      data: {
        downloads: typeof downloadsIncrement === 'number' ? { increment: downloadsIncrement } : undefined,
      }
    });

    return res.json(report);
  } catch (error) {
    console.error('Erro ao atualizar relatório:', error);
    return res.status(500).json({ error: 'Erro ao atualizar relatório' });
  }
});

export default router;
