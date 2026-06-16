import prisma from '../lib/prisma.js';

const PAID_ORDER_STATUSES = ['RECEIVED', 'SEPARATING', 'DELIVERING', 'FINISHED'] as const;
const CHART_HOURS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'] as const;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function hourLabel(date: Date): string {
  const hour = date.getHours();
  if (hour >= 22) return '22:00';
  if (hour >= 20) return '20:00';
  if (hour >= 18) return '18:00';
  if (hour >= 16) return '16:00';
  if (hour >= 14) return '14:00';
  if (hour >= 12) return '12:00';
  if (hour >= 10) return '10:00';
  return '08:00';
}

export async function getPharmacyDashboardKpis(pharmacyId: string) {
  const today = startOfToday();

  const ordersToday = await prisma.pharmacyOrder.count({
    where: {
      pharmacyId,
      createdAt: { gte: today },
      status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] },
    },
  });

  const quotesToday = await prisma.quotationRequest.findMany({
    where: { createdAt: { gte: today } },
    select: { id: true },
  });
  const quoteIdsToday = quotesToday.map((q) => q.id);

  const myResponsesToday = await prisma.quotationResponse.count({
    where: { pharmacyId, createdAt: { gte: today } },
  });

  const myResponsesToTodayQuotes =
    quoteIdsToday.length > 0
      ? await prisma.quotationResponse.count({
          where: {
            pharmacyId,
            quotationId: { in: quoteIdsToday },
          },
        })
      : 0;

  let responseRate = 0;
  if (quoteIdsToday.length > 0) {
    responseRate = Math.min(
      100,
      Math.round((myResponsesToTodayQuotes / quoteIdsToday.length) * 100)
    );
  } else if (myResponsesToday > 0) {
    responseRate = 100;
  }

  const responsesToday = await prisma.quotationResponse.findMany({
    where: { pharmacyId, createdAt: { gte: today } },
    select: {
      responseTimeSec: true,
      createdAt: true,
      QuotationRequest: { select: { createdAt: true } },
    },
  });

  let totalSec = 0;
  let responseTimeCount = 0;
  for (const r of responsesToday) {
    const sec =
      r.responseTimeSec ??
      Math.floor(
        (r.createdAt.getTime() - r.QuotationRequest.createdAt.getTime()) / 1000
      );
    if (sec >= 0) {
      totalSec += sec;
      responseTimeCount += 1;
    }
  }

  const avgResponseTime =
    responseTimeCount > 0 ? Math.round(totalSec / responseTimeCount) : 0;

  const ordersRevenueToday = await prisma.pharmacyOrder.aggregate({
    where: {
      pharmacyId,
      createdAt: { gte: today },
      status: { in: [...PAID_ORDER_STATUSES] },
    },
    _sum: { total: true },
  });

  const quotesRevenueToday = await prisma.quotationResponse.aggregate({
    where: {
      pharmacyId,
      status: { in: ['ACCEPTED', 'FINISHED'] },
      createdAt: { gte: today },
    },
    _sum: { price: true },
  });

  const winCount = await prisma.quotationResponse.count({
    where: { pharmacyId, status: { in: ['ACCEPTED', 'FINISHED'] } },
  });

  const estimatedRevenue =
    Math.round(
      ((ordersRevenueToday._sum.total || 0) + (quotesRevenueToday._sum.price || 0)) *
        100
    ) / 100;

  const openQuotesCount = await prisma.quotationRequest.count({
    where: { status: 'OPEN' },
  });

  return {
    requestsToday: ordersToday,
    ordersToday,
    quotesTodayCount: quoteIdsToday.length,
    myResponsesToday,
    responseRate,
    avgResponseTime,
    winCount,
    estimatedRevenue,
    openQuotesCount,
  };
}

export async function getPharmacyDashboardChart(pharmacyId: string) {
  const today = startOfToday();

  const [orders, quoteRequests] = await Promise.all([
    prisma.pharmacyOrder.findMany({
      where: {
        pharmacyId,
        createdAt: { gte: today },
        status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] },
      },
      select: { createdAt: true },
    }),
    prisma.quotationRequest.findMany({
      where: { createdAt: { gte: today } },
      select: { createdAt: true },
    }),
  ]);

  const hourlyData: Record<string, number> = {};
  for (const h of CHART_HOURS) hourlyData[h] = 0;

  for (const o of orders) {
    const label = hourLabel(o.createdAt);
    hourlyData[label] = (hourlyData[label] || 0) + 1;
  }

  for (const q of quoteRequests) {
    const label = hourLabel(q.createdAt);
    hourlyData[label] = (hourlyData[label] || 0) + 1;
  }

  const total = orders.length + quoteRequests.length;

  return CHART_HOURS.map((name) => ({
    name,
    pedidos: hourlyData[name] || 0,
    conversao:
      hourlyData[name] > 0 && total > 0
        ? Math.round((hourlyData[name] / total) * 100)
        : 0,
  }));
}

export function buildPharmacyDashboardInsights(
  kpis: Awaited<ReturnType<typeof getPharmacyDashboardKpis>>,
  lostSales: number
) {
  const insights: Array<{
    id: string;
    type: string;
    message: string;
    action: string;
    link: string;
  }> = [];

  if (lostSales > 0) {
    insights.push({
      id: 'stock',
      type: 'warning',
      message: `Você perdeu ${lostSales} venda(s) hoje por falta de estoque informado.`,
      action: 'Atualizar Estoque',
      link: '/pharmacy/ia-crescimento',
    });
  } else {
    insights.push({
      id: 'stock',
      type: 'info',
      message:
        kpis.ordersToday > 0
          ? `Sua farmácia processou ${kpis.ordersToday} pedido(s) hoje. Estoque alinhado à demanda.`
          : 'Seu estoque está bem sinalizado para as demandas de hoje.',
      action: 'Atualizar Estoque',
      link: '/pharmacy/ia-crescimento',
    });
  }

  if (kpis.openQuotesCount > 0) {
    insights.push({
      id: 'quotes',
      type: 'info',
      message: `${kpis.openQuotesCount} cotação(ões) aberta(s) na região — responda no radar para aumentar conversão.`,
      action: 'Ver Radar',
      link: '/pharmacy/pedidos',
    });
  } else if (kpis.estimatedRevenue > 0) {
    insights.push({
      id: 'revenue',
      type: 'info',
      message: `Faturamento estimado de hoje: R$ ${kpis.estimatedRevenue.toFixed(2).replace('.', ',')}.`,
      action: 'Ver Financeiro',
      link: '/pharmacy/financeiro',
    });
  } else {
    insights.push({
      id: 'demand',
      type: 'info',
      message:
        'Monitore o radar de cotações e a vitrine para captar demanda na sua região.',
      action: 'Ver Detalhes',
      link: '/pharmacy/demandas-ia',
    });
  }

  return insights;
}
