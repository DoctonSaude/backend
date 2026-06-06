// @ts-nocheck
import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Validação para eventos de analytics
const analyticsValidation = [
  body('event').notEmpty().withMessage('Event é obrigatório'),
  body('properties').optional().isObject(),
];

const adminAuth = process.env.NODE_ENV === 'development' ? [] : [authenticate, authorize('ADMIN')];

// ─────────────────────────────────────────────────────────────────────────────
// TRACKING DE EVENTOS
// ─────────────────────────────────────────────────────────────────────────────

router.post('/track', analyticsValidation, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { event, properties, userId, timestamp } = req.body;
  try {
    const parsedTimestamp = timestamp
      ? new Date(isNaN(Number(timestamp)) ? timestamp : Number(timestamp))
      : new Date();

    await prisma.analyticsEvent.create({
      data: {
        event,
        properties: properties ? JSON.stringify(properties) : '{}',
        propertiesJson: properties || {},
        userId: userId || 'anonymous',
        timestamp: parsedTimestamp,
        sessionId: properties?.sessionId,
        page: properties?.page || properties?.path,
      },
    });
    res.status(200).json({ success: true, message: 'Event tracked' });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(200).json({ success: true, message: 'Event tracked (logged only)', fallback: true });
  }
});

router.post('/track-batch', [
  body('events').isArray().withMessage('Events deve ser um array'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0)
    return res.status(400).json({ error: 'Events deve ser um array não vazio' });

  try {
    await prisma.analyticsEvent.createMany({
      data: events.map((e: any) => ({
        event: e.event,
        properties: e.properties ? JSON.stringify(e.properties) : '{}',
        propertiesJson: e.properties || {},
        userId: e.userId || 'anonymous',
        timestamp: e.timestamp ? new Date(isNaN(Number(e.timestamp)) ? e.timestamp : Number(e.timestamp)) : new Date(),
        sessionId: e.sessionId || e.properties?.sessionId,
        page: e.page || e.properties?.page || e.properties?.path,
      })),
    });
    res.status(200).json({ success: true, message: `${events.length} events processed` });
  } catch (error) {
    console.error('Error tracking batch events:', error);
    res.status(200).json({ success: true, message: `${events.length} events processed (logged only)`, fallback: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// VISÃO GERAL (Cards superiores)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/overview', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalPartners, totalRevenueData, totalAppointments] = await Promise.all([
      prisma.user.count(),
      prisma.partner.count(),
      prisma.transaction.aggregate({ where: { type: 'INCOME' }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
      prisma.appointment.count(),
    ]);

    const starts = await prisma.analyticsEvent.count({ where: { event: 'registration_started' } });
    const completions = await prisma.analyticsEvent.count({ where: { event: 'registration_completed' } });
    const conversionRate = starts > 0 ? Math.round((completions / starts) * 1000) / 10 : 0;

    const reviews = await prisma.review.findMany({ select: { rating: true } });
    const satisfaction =
      reviews.length > 0
        ? Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10) / 10
        : 5.0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [activeSubs, cancelledSubs] = await Promise.all([
      prisma.subscription.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
      prisma.subscription.count({ where: { status: 'CANCELLED', cancelledAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
    ]);

    const totalBase = activeSubs + cancelledSubs;
    const churnRate = totalBase > 0 ? Math.round((cancelledSubs / totalBase) * 10000) / 100 : 0;

    res.json({
      totalUsers,
      totalPartners,
      totalRevenue: totalRevenueData._sum.amount || 0,
      totalAppointments,
      conversionRate,
      customerSatisfaction: satisfaction,
      churnRate,
    });
  } catch (error) {
    console.error('Error getting overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DADOS HISTÓRICOS (Gráficos de linha e área)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route GET /api/analytics/revenue-history
 * Retorna receita agrupada por mês (últimos 6 meses)
 */
router.get('/revenue-history', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const transactions = await prisma.transaction.findMany({
      where: { type: 'INCOME', createdAt: { gte: sixMonthsAgo } },
      select: { amount: true, createdAt: true },
    }).catch(() => []);

    // Agrupar por mês
    const monthMap: Record<string, { receita: number; meta: number; crescimento: number }> = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    transactions.forEach((tx: any) => {
      const d = new Date(tx.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = monthNames[d.getMonth()];
      if (!monthMap[key]) monthMap[key] = { receita: 0, meta: 0, crescimento: 0, month: label } as any;
      monthMap[key].receita += Number(tx.amount || 0);
    });

    // Construir array ordenado dos últimos 6 meses
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = monthNames[d.getMonth()];
      const receita = monthMap[key]?.receita || 0;
      const prevReceita = result.length > 0 ? result[result.length - 1].receita : 0;
      const crescimento = prevReceita > 0 ? Math.round(((receita - prevReceita) / prevReceita) * 100) : 0;
      result.push({
        month: label,
        receita,
        meta: Math.round(receita * 0.9) || 0,
        crescimento,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error getting revenue history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/analytics/user-growth-history
 * Retorna crescimento de usuários agrupado por mês (últimos 6 meses)
 */
router.get('/user-growth-history', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date();
      startOfMonth.setMonth(startOfMonth.getMonth() - i);
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      const label = monthNames[startOfMonth.getMonth()];

      const [novos, churnSubs] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: startOfMonth, lt: endOfMonth } } }),
        prisma.subscription.count({
          where: { status: 'CANCELLED', cancelledAt: { gte: startOfMonth, lt: endOfMonth } },
        }).catch(() => 0),
      ]);

      // Total de ativos até aquele mês
      const ativos = await prisma.user.count({ where: { createdAt: { lt: endOfMonth } } });

      result.push({ month: label, novos, ativos, churn: churnSubs });
    }

    res.json(result);
  } catch (error) {
    console.error('Error getting user growth history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ESPECIALIDADES (Gráfico de pizza)
// ─────────────────────────────────────────────────────────────────────────────

const SPECIALTY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#6B7280', '#F97316',
];

/**
 * @route GET /api/analytics/specialty-distribution
 * Retorna distribuição de especialidades dos parceiros
 */
router.get('/specialty-distribution', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const partners = await prisma.partner.findMany({
      select: { specialty: true, specialties: true },
      where: { isApproved: true },
    });

    const countMap: Record<string, number> = {};
    partners.forEach((p: any) => {
      const specialties: string[] = [];
      if (p.specialties && p.specialties.length > 0) {
        specialties.push(...p.specialties);
      } else if (p.specialty) {
        specialties.push(p.specialty);
      } else {
        specialties.push('Outros');
      }
      specialties.forEach((s: string) => {
        const name = s.trim() || 'Outros';
        countMap[name] = (countMap[name] || 0) + 1;
      });
    });

    const sorted = Object.entries(countMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    const result = sorted.map(([name, value], idx) => ({
      name,
      value,
      color: SPECIALTY_COLORS[idx % SPECIALTY_COLORS.length],
    }));

    if (result.length === 0) {
      result.push({ name: 'Nenhum parceiro aprovado', value: 1, color: '#6B7280' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error getting specialty distribution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TOP PARCEIROS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route GET /api/analytics/top-partners
 * Retorna os 5 melhores parceiros por avaliação e número de consultas
 */
router.get('/top-partners', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const partners = await prisma.partner.findMany({
      take: 5,
      where: { isApproved: true },
      select: {
        id: true,
        name: true,
        rating: true,
        totalReviews: true,
        specialty: true,
        Appointment: { select: { id: true } },
      },
      orderBy: { rating: 'desc' },
    });

    const result = partners.map((p: any) => ({
      name: p.name || 'Parceiro',
      revenue: 0,
      quotes: p.Appointment?.length || 0,
      rating: p.rating || 5.0,
      growth: 0,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error getting top partners:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ESTATÍSTICAS DE REGISTRO
// ─────────────────────────────────────────────────────────────────────────────

router.get('/registration-stats', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const dbEvents = await prisma.analyticsEvent.findMany({
      where: { event: { startsWith: 'registration_' } },
    });

    const registrationEvents = dbEvents.map((e: any) => ({
      event: e.event,
      properties: typeof e.properties === 'string' ? JSON.parse(e.properties) : (e.properties || {}),
      userId: e.userId,
      timestamp: e.timestampBigInt ? Number(e.timestampBigInt) : new Date(e.timestamp).getTime(),
      sessionId: e.sessionId,
      page: e.page,
      createdAt: e.createdAt.toISOString(),
    }));

    const stats = {
      totalStarts: registrationEvents.filter((e: any) => e.event === 'registration_started').length,
      totalCompletions: registrationEvents.filter((e: any) => e.event === 'registration_completed').length,
      totalErrors: registrationEvents.filter((e: any) => e.event === 'registration_error').length,
      averageTime: calculateAverageTime(registrationEvents),
      completionRate: calculateCompletionRate(registrationEvents),
      errorsByStep: groupErrorsByStep(registrationEvents),
      byRole: groupByRole(registrationEvents),
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting registration stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/email-verification-stats', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const dbEvents = await prisma.analyticsEvent.findMany({ where: { event: 'email_verification' } });
    const events = dbEvents.map((e: any) => ({
      event: e.event,
      properties: typeof e.properties === 'string' ? JSON.parse(e.properties) : (e.properties || {}),
      timestamp: e.timestampBigInt ? Number(e.timestampBigInt) : new Date(e.timestamp).getTime(),
      createdAt: e.createdAt.toISOString(),
    }));

    const stats = {
      totalSent: events.filter((e: any) => (e.properties as any).status === 'sent').length,
      totalVerified: events.filter((e: any) => (e.properties as any).status === 'verified').length,
      totalFailed: events.filter((e: any) => (e.properties as any).status === 'failed').length,
      verificationRate: calculateVerificationRate(events),
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting email verification stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// A/B TESTING
// ─────────────────────────────────────────────────────────────────────────────

router.post('/ab-testing/conversion', async (req: Request, res: Response) => {
  const { testName, variant, conversionType } = req.body;
  if (!testName || !variant) return res.status(400).json({ error: 'testName e variant são obrigatórios' });

  try {
    const created = await prisma.analyticsEvent.create({
      data: {
        event: `ab_test_conversion:${testName}`,
        properties: JSON.stringify({ variant, conversionType }),
        propertiesJson: { variant, conversionType },
        timestamp: new Date(),
        userId: 'anonymous',
      },
    });
    res.status(200).json({ success: true, id: created.id, timestamp: created.timestamp });
  } catch (error) {
    console.error('Error tracking A/B conversion:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

router.post('/ab-testing/conversion-batch', [
  body('conversions').isArray().withMessage('Conversions deve ser um array'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { conversions } = req.body;
  if (!Array.isArray(conversions) || conversions.length === 0)
    return res.status(400).json({ error: 'Conversions deve ser um array não vazio' });

  try {
    await prisma.analyticsEvent.createMany({
      data: conversions.map((c: any) => ({
        event: `ab_test_batch:${c.testName}`,
        properties: JSON.stringify({ variant: c.variant, conversionType: c.conversionType }),
        propertiesJson: { variant: c.variant, conversionType: c.conversionType },
        timestamp: new Date(Number(c.timestamp || Date.now())),
        userId: 'anonymous',
      })),
    });
    res.status(200).json({ success: true, message: `${conversions.length} conversions processed` });
  } catch (error) {
    console.error('Error tracking A/B conversion batch:', error);
    res.status(200).json({ success: true, message: `${conversions.length} conversions processed (logged only)`, fallback: true });
  }
});

/**
 * @route GET /api/analytics/ab-testing/results/:testName?
 * Busca resultados de A/B testing via AnalyticsEvent (sem tabela dedicada)
 */
router.get('/ab-testing/results/:testName?', ...adminAuth, async (req: Request, res: Response) => {
  const { testName } = req.params;

  try {
    const where: any = { event: { startsWith: 'ab_test_conversion:' } };
    if (testName) where.event = `ab_test_conversion:${testName}`;

    const dbEvents = await prisma.analyticsEvent.findMany({ where });

    const results = dbEvents.map((e: any) => {
      const props = e.propertiesJson || {};
      return {
        testName: e.event.replace('ab_test_conversion:', ''),
        variant: (props as any).variant || 'control',
        conversionType: (props as any).conversionType || 'click',
        timestamp: e.timestamp,
        createdAt: e.createdAt.toISOString(),
      };
    });

    const grouped = results.reduce((acc: any, result: any) => {
      const key = `${result.testName}_${result.variant}`;
      if (!acc[key]) acc[key] = { testName: result.testName, variant: result.variant, conversions: 0, conversionTypes: {} };
      acc[key].conversions++;
      acc[key].conversionTypes[result.conversionType] = (acc[key].conversionTypes[result.conversionType] || 0) + 1;
      return acc;
    }, {});

    const stats = Object.values(grouped).map((group: any) => ({
      ...group,
      conversionRate: results.length > 0 ? (group.conversions / results.length) * 100 : 0,
    }));

    res.json({ results: stats, total: results.length });
  } catch (error) {
    console.error('Error getting A/B results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CRUD DE ALERTAS (AnalyticsAlert)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/alerts', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const alerts = await prisma.analyticsAlert.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(alerts);
  } catch (error) {
    console.error('Error listing alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/alerts', [
  ...adminAuth,
  body('metric').notEmpty(),
  body('threshold').isNumeric(),
  body('condition').isString(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { metric, threshold, condition, active } = req.body;
  try {
    const created = await prisma.analyticsAlert.create({
      data: { metric, threshold: Number(threshold), condition, active: active !== false },
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/alerts/:id', ...adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { metric, threshold, condition, active } = req.body;
  try {
    const updated = await prisma.analyticsAlert.update({
      where: { id },
      data: {
        ...(metric !== undefined && { metric }),
        ...(threshold !== undefined && { threshold: Number(threshold) }),
        ...(condition !== undefined && { condition }),
        ...(active !== undefined && { active }),
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

router.delete('/alerts/:id', ...adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.analyticsAlert.delete({ where: { id } });
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

function calculateAverageTime(events: any[]): number {
  const completions = events.filter((e) => e.event === 'registration_completed');
  if (completions.length === 0) return 0;
  const times = completions.map((e) => e.properties?.timeSpent).filter((t) => t && typeof t === 'number');
  if (times.length === 0) return 0;
  return Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
}

function calculateCompletionRate(events: any[]): number {
  const starts = events.filter((e) => e.event === 'registration_started').length;
  const completions = events.filter((e) => e.event === 'registration_completed').length;
  if (starts === 0) return 0;
  return Math.round((completions / starts) * 100);
}

function calculateVerificationRate(events: any[]): number {
  const sent = events.filter((e) => e.properties?.status === 'sent').length;
  const verified = events.filter((e) => e.properties?.status === 'verified').length;
  if (sent === 0) return 0;
  return Math.round((verified / sent) * 100);
}

function groupErrorsByStep(events: any[]): Record<string, number> {
  return events
    .filter((e) => e.event === 'registration_error')
    .reduce((acc: Record<string, number>, error) => {
      const step = error.properties?.step || 'unknown';
      acc[step] = (acc[step] || 0) + 1;
      return acc;
    }, {});
}

function groupByRole(events: any[]): Record<string, number> {
  return events
    .filter((e) => e.event === 'registration_started')
    .reduce((acc: Record<string, number>, event) => {
      const role = event.properties?.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
}

export default router;
