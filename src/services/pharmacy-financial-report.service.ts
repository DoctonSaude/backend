import prisma from '../lib/prisma.js';

const REVENUE_STATUSES = ['RECEIVED', 'SEPARATING', 'DELIVERING', 'FINISHED'] as const;

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function effectiveCommission(
  total: number,
  commissionAmount: number,
  rate: number
): number {
  if (commissionAmount > 0) return commissionAmount;
  return Math.round(total * rate * 100) / 100;
}

export async function getPharmacyFinancialReport(pharmacyId: string) {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { commissionPercent: true, name: true },
  });

  const commissionRate = (pharmacy?.commissionPercent ?? 10) / 100;
  const now = new Date();
  const { start: monthStart, end: monthEnd } = monthRange(now);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const { start: prevStart, end: prevEnd } = monthRange(prevMonth);

  const [directOrders, quoteOrders] = await Promise.all([
    prisma.pharmacyOrder.findMany({
      where: {
        pharmacyId,
        status: { in: [...REVENUE_STATUSES] },
      },
      select: {
        id: true,
        total: true,
        commissionAmount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.quotationResponse.findMany({
      where: {
        pharmacyId,
        status: { in: [...REVENUE_STATUSES] },
      },
      select: {
        id: true,
        price: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  let totalRevenue = 0;
  let totalCommission = 0;
  let completedOrdersThisMonth = 0;
  let pendingNetPayout = 0;
  let finishedNetPayout = 0;
  let monthRevenue = 0;
  let prevMonthRevenue = 0;

  for (const o of directOrders) {
    const comm = effectiveCommission(o.total, o.commissionAmount, commissionRate);
    const net = o.total - comm;
    totalRevenue += o.total;
    totalCommission += comm;

    const inMonth =
      o.createdAt >= monthStart && o.createdAt <= monthEnd;
    if (inMonth) monthRevenue += o.total;

    const inPrev =
      o.createdAt >= prevStart && o.createdAt <= prevEnd;
    if (inPrev) prevMonthRevenue += o.total;

    if (o.status === 'FINISHED' && inMonth) {
      completedOrdersThisMonth += 1;
      finishedNetPayout += net;
    } else if (o.status !== 'FINISHED' && o.status !== 'CANCELLED') {
      pendingNetPayout += net;
    }
  }

  for (const q of quoteOrders) {
    const comm = q.price * commissionRate;
    const net = q.price - comm;
    totalRevenue += q.price;
    totalCommission += comm;

    const inMonth =
      q.createdAt >= monthStart && q.createdAt <= monthEnd;
    if (inMonth) monthRevenue += q.price;

    const inPrev =
      q.createdAt >= prevStart && q.createdAt <= prevEnd;
    if (inPrev) prevMonthRevenue += q.price;

    if (q.status === 'FINISHED' && inMonth) {
      completedOrdersThisMonth += 1;
      finishedNetPayout += net;
    } else if (q.status !== 'FINISHED') {
      pendingNetPayout += net;
    }
  }

  const netPayout = totalRevenue - totalCommission;
  const orderCount = directOrders.length + quoteOrders.length;

  let revenueGrowthPercent = 0;
  if (prevMonthRevenue > 0) {
    revenueGrowthPercent =
      Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 1000) / 10;
  } else if (monthRevenue > 0) {
    revenueGrowthPercent = 100;
  }

  return {
    pharmacyName: pharmacy?.name,
    commissionPercent: pharmacy?.commissionPercent ?? 10,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCommission: Math.round(totalCommission * 100) / 100,
    netPayout: Math.round(netPayout * 100) / 100,
    orderCount,
    completedOrdersThisMonth,
    monthRevenue: Math.round(monthRevenue * 100) / 100,
    revenueGrowthPercent,
    pendingNetPayout: Math.round(pendingNetPayout * 100) / 100,
    finishedNetPayout: Math.round(finishedNetPayout * 100) / 100,
    /** Valor a receber quando pedidos em andamento forem concluídos */
    receivableNet: Math.round(pendingNetPayout * 100) / 100,
  };
}

export { REVENUE_STATUSES };
