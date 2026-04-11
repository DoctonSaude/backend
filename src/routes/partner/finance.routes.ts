import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { format as dateFnsFormat } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RevenueService } from '../../services/revenue.service.js';

const router = Router();

/**
 * @route GET /api/partners/dashboard
 */
router.get('/dashboard', authenticate, authorize('PARTNER'), async (req: any, res) => {
  res.setHeader('X-Backend-Version', '2026.04.09.v6-modular');
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({
      where: { userId },
      select: { id: true, rating: true, totalReviews: true, createdAt: true }
    });

    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalAppointments,
      completedAppointments,
      upcomingAppointments,
      thisMonthAppts,
      lastMonthAppts,
      monthlyRevenueData,
      lastMonthRevenueData,
      recentAppointments,
      validatedCodes
    ] = await Promise.all([
      prisma.appointment.count({ where: { partnerId: partner.id } }),
      prisma.appointment.count({ where: { partnerId: partner.id, status: 'COMPLETED' } }),
      prisma.appointment.count({ where: { partnerId: partner.id, status: { in: ['SCHEDULED', 'CONFIRMED'] } } }),
      prisma.appointment.count({ where: { partnerId: partner.id, createdAt: { gte: startOfMonth } } }),
      prisma.appointment.count({ where: { partnerId: partner.id, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.transaction.aggregate({
        where: { partnerId: partner.id, type: 'CREDIT', status: 'COMPLETED', createdAt: { gte: startOfMonth } },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { partnerId: partner.id, type: 'CREDIT', status: 'COMPLETED', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amount: true }
      }),
      prisma.appointment.findMany({
        where: { partnerId: partner.id },
        orderBy: { dateTime: 'desc' },
        take: 5,
        include: { patient: { include: { user: { select: { name: true, avatar: true } } } } }
      }),
      prisma.validationCodeLog.findMany({
        where: { partnerId: partner.id },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: { patient: { select: { user: { select: { name: true, avatar: true } } } } }
      })
    ]);

    const rev = monthlyRevenueData._sum.amount || 0;
    const lastRev = lastMonthRevenueData._sum.amount || 0;
    const revGrowth = lastRev > 0 ? ((rev - lastRev) / lastRev) * 100 : 0;
    const apptsGrowth = lastMonthAppts > 0 ? ((thisMonthAppts - lastMonthAppts) / lastMonthAppts) * 100 : 0;

    const period = (req.query.period as string) || 'week';
    const chartStartDate = new Date();
    if (period === 'week') chartStartDate.setDate(chartStartDate.getDate() - 6);
    else chartStartDate.setDate(chartStartDate.getDate() - 29);
    chartStartDate.setHours(0, 0, 0, 0);

    const [dailyRevenue, dailyAppts] = await Promise.all([
      prisma.transaction.findMany({
        where: { partnerId: partner.id, status: 'COMPLETED', type: 'CREDIT', createdAt: { gte: chartStartDate } },
        select: { amount: true, createdAt: true }
      }),
      prisma.appointment.findMany({
        where: { partnerId: partner.id, dateTime: { gte: chartStartDate } },
        select: { dateTime: true }
      })
    ]);

    const daysToGenerate = period === 'week' ? 7 : 30;
    const chartData = Array.from({ length: daysToGenerate }, (_, i) => {
      const d = new Date(chartStartDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayRev = dailyRevenue.filter(r => r.createdAt.toISOString().split('T')[0] === dateStr).reduce((sum, r) => sum + r.amount, 0);
      const dayAppts = dailyAppts.filter(a => a.dateTime.toISOString().split('T')[0] === dateStr).length;
      return {
        name: period === 'week' ? dateFnsFormat(d, 'EEE', { locale: ptBR }) : dateFnsFormat(d, 'dd/MM'),
        value: dayRev,
        appts: dayAppts
      };
    });

    return res.json({
      metrics: {
        newAppointments: thisMonthAppts,
        monthlyRevenue: rev,
        revenueGrowth: Math.round(revGrowth),
        completedAppointments,
        apptsGrowth: Math.round(apptsGrowth),
        upcomingAppointments,
        rating: partner.rating || 0,
        totalReviews: partner.totalReviews || 0
      },
      recentAppointments: recentAppointments.map(appt => ({
        id: appt.id,
        patientName: appt.patient?.user?.name || 'Paciente',
        patientAvatar: appt.patient?.user?.avatar,
        dateTime: appt.dateTime,
        status: appt.status,
        isOnline: (appt as any).isOnline
      })),
      validatedCodes: validatedCodes.map(log => ({
        id: log.id,
        code: log.code,
        patientName: log.patient?.user?.name || 'Paciente',
        patientAvatar: log.patient?.user?.avatar,
        timestamp: log.timestamp,
        status: log.status
      })),
      chartData: chartData
    });
  } catch (error) {
    console.error('Erro ao obter dashboard do parceiro:', error);
    return res.status(500).json({ error: 'Erro ao obter dashboard do parceiro' });
  }
});

/**
 * @route GET /api/partners/revenue/insights
 */
router.get('/revenue/insights', authenticate, authorize('PARTNER', 'PHARMACY'), async (req: any, res) => {
  res.setHeader('X-Backend-Version', '2026.04.09.v6-modular');
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });
    const insights = await RevenueService.getInsights(partner.id);
    return res.json(insights);
  } catch (error: any) {
    console.error(`[Partners/Insights] Erro:`, error?.message);
    return res.status(500).json({ error: 'Erro interno ao gerar insights' });
  }
});

export default router;
