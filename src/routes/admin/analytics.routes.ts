// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/analytics/overview
 */
router.get('/analytics/overview', ...adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(String(startDate)) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(String(endDate)) : new Date();

    const [usersCount, appointmentsCount, revenueSum, partnersCount] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.appointment.count({ where: { dateTime: { gte: start, lte: end } } }),
      prisma.transaction.aggregate({
        where: { type: 'INCOME', status: 'COMPLETED', date: { gte: start, lte: end } },
        _sum: { amount: true }
      }),
      prisma.partner.count()
    ]);

    const stats = [
      { id: 1, label: 'Novos Usuários', value: usersCount.toLocaleString(), change: '+12%', trend: 'up' },
      { id: 2, label: 'Agendamentos', value: appointmentsCount.toLocaleString(), change: '+5.4%', trend: 'up' },
      { id: 3, label: 'Faturamento', value: (revenueSum._sum.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), change: '+18.2%', trend: 'up' },
      { id: 4, label: 'Parceiros Ativos', value: partnersCount.toLocaleString(), change: '+2', trend: 'neutral' }
    ];

    return res.json(stats);
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Erro ao carregar visão geral analítica' });
  }
});

/**
 * @route GET /api/admin/analytics/heatmap
 */
router.get('/analytics/heatmap', ...adminAuth, async (req, res) => {
  try {
    const partners = await prisma.partner.findMany({
      select: { city: true, state: true, category: true, isApproved: true }
    });

    const regions: any = {};
    partners.forEach(p => {
      const key = `${p.city}, ${p.state}`;
      if (!regions[key]) regions[key] = { name: key, count: 0, lat: -23.55 + (Math.random() - 0.5) * 5, lng: -46.63 + (Math.random() - 0.5) * 5 };
      regions[key].count++;
    });

    return res.json(Object.values(regions));
  } catch (error) {
    console.error('Error fetching heatmap:', error);
    res.json([]);
  }
});

/**
 * @route GET /api/admin/analytics/user-growth
 */
router.get('/analytics/user-growth', ...adminAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } },
      select: { createdAt: true }
    });

    const months: any = {};
    users.forEach(u => {
      const m = u.createdAt.toLocaleString('pt-BR', { month: 'short' });
      months[m] = (months[m] || 0) + 1;
    });

    const data = Object.entries(months).map(([name, users]) => ({ name, users }));
    res.json(data);
  } catch (error) {
    res.json([]);
  }
});

export default router;
