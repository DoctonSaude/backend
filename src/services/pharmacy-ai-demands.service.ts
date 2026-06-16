import prisma from '../lib/prisma.js';
import { QuotationService } from './quotation.service.js';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseContext(ctx: unknown) {
  if (!ctx || typeof ctx !== 'object') return {} as Record<string, unknown>;
  return ctx as Record<string, unknown>;
}

function formatBRL(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export function normalizeHealthIntentLead(intent: {
  id: string;
  intent: string;
  status: string;
  createdAt: Date;
  context: unknown;
  patient?: {
    User?: { name?: string | null; avatar?: string | null; phone?: string | null } | null;
    Person?: { name?: string | null; phone?: string | null } | null;
  } | null;
}) {
  const ctx = parseContext(intent.context);
  const metadata = (ctx.metadata as Record<string, unknown>) || {};
  const item =
    (ctx.item as string) ||
    (metadata.medication as string) ||
    (metadata.item as string) ||
    (ctx.description as string) ||
    'Medicamento / produto';

  return {
    id: intent.id,
    intent: intent.intent,
    status: intent.status,
    createdAt: intent.createdAt,
    source: 'LUMA_AGENT' as const,
    context: {
      item,
      description: (ctx.description as string) || (ctx.query as string) || 'Intenção registrada pelo assistente.',
      metadata,
      query: ctx.query,
    },
    patient: {
      user: {
        name:
          intent.patient?.Person?.name ||
          intent.patient?.User?.name ||
          'Paciente',
        avatar: intent.patient?.User?.avatar || null,
        phone:
          intent.patient?.Person?.phone ||
          intent.patient?.User?.phone ||
          null,
      },
    },
  };
}

function mapOrderToLead(order: {
  id: string;
  status: string;
  total: number;
  createdAt: Date;
  Patient?: {
    User?: { name?: string | null; avatar?: string | null; phone?: string | null };
    Person?: { name?: string | null; phone?: string | null };
  } | null;
  PharmacyOrderItem?: { quantity: number; PharmacyProduct?: { name?: string } | null }[];
}) {
  const patient = order.Patient?.Person || order.Patient?.User;
  const items =
    order.PharmacyOrderItem?.map(
      (i) => `${i.quantity}x ${i.PharmacyProduct?.name || 'Produto'}`
    ).join(', ') || 'Pedido vitrine';

  return {
    id: `order-${order.id}`,
    orderId: order.id,
    intent: 'ORDER',
    status: order.status,
    createdAt: order.createdAt,
    source: 'VITRINE' as const,
    context: {
      item: items,
      description: `Pedido pago na vitrine — ${formatBRL(order.total)}`,
      metadata: { total: order.total },
    },
    patient: {
      user: {
        name: patient?.name || 'Paciente',
        avatar: order.Patient?.User?.avatar || null,
        phone: patient?.phone || null,
      },
    },
  };
}

function mapQuotationToLead(q: {
  id: string;
  createdAt: Date;
  status: string;
  medicamentName?: string | null;
  description?: string | null;
  QuotationRequestItem?: { name: string; quantity: number }[];
  patient?: {
    User?: { name?: string | null; avatar?: string | null; phone?: string | null };
    Person?: { name?: string | null; phone?: string | null };
  };
}) {
  const items = q.QuotationRequestItem || [];
  const item =
    q.medicamentName ||
    items.map((i) => i.name).join(', ') ||
    'Cotação de medicamentos';

  return {
    id: `quote-${q.id}`,
    quotationId: q.id,
    intent: 'QUOTE',
    status: q.status === 'OPEN' ? 'OPEN' : 'CONTACTED',
    createdAt: q.createdAt,
    source: 'QUOTATION' as const,
    context: {
      item,
      description: q.description || 'Demanda de cotação na região.',
      metadata: {},
    },
    patient: {
      user: {
        name: q.patient?.Person?.name || q.patient?.User?.name || 'Paciente',
        avatar: q.patient?.User?.avatar || null,
        phone: q.patient?.Person?.phone || q.patient?.User?.phone || null,
      },
    },
  };
}

export async function getPharmacyDemandHistory(pharmacyId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const responses = await prisma.quotationResponse.findMany({
    where: { pharmacyId, createdAt: { gte: thirtyDaysAgo } },
    include: {
      QuotationRequest: {
        include: {
          QuotationRequestItem: true,
          Patient: {
            include: {
              User: { select: { name: true } },
              Person: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const wonStatuses = ['ACCEPTED', 'FINISHED', 'DELIVERING'];
  const won = responses.filter((r) => wonStatuses.includes(r.status));
  const revenueWon = won.reduce((s, r) => s + r.price, 0);

  const items = responses.map((r) => {
    const q = r as any; // Ignore types to access included relation without error
    const patientName =
      q?.patient?.Person?.name || q?.patient?.User?.name || 'Paciente';
    const item =
      q?.QuotationRequestItem?.map((i) => i.name).join(', ') ||
      q?.medicamentName ||
      'Cotação';

    return {
      id: r.id,
      type: wonStatuses.includes(r.status) ? 'won' : 'proposal',
      title: item,
      patientName,
      price: r.price,
      status: r.status,
      createdAt: r.createdAt,
    };
  });

  return {
    items,
    summary: {
      proposalsSent: responses.length,
      quotesWon: won.length,
      revenueWon: Math.round(revenueWon * 100) / 100,
    },
  };
}

export async function getPharmacyAiDemands(pharmacyId: string) {
  const today = startOfToday();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    intents,
    openQuotations,
    wonQuotations,
    pendingOrders,
    products,
    ordersTodayAgg,
    quotesTodayAgg,
    myResponsesToday,
    intentsCount7d,
    history,
  ] = await Promise.all([
      prisma.healthIntent.findMany({
        where: {
          intent: { in: ['QUOTE', 'PHARMACY', 'MEDICATION', 'INFO'] },
          status: { in: ['OPEN', 'CONTACTED'] },
          createdAt: { gte: sevenDaysAgo },
        },
        include: {
          patient: {
            include: {
              User: { select: { name: true, avatar: true, phone: true } },
              Person: { select: { name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      QuotationService.getOpenQuotations(pharmacyId),
      QuotationService.getWonQuotations(pharmacyId),
      prisma.pharmacyOrder.findMany({
        where: {
          pharmacyId,
          status: { in: ['RECEIVED', 'SEPARATING'] },
          createdAt: { gte: sevenDaysAgo },
        },
        include: {
          patient: {
            include: {
              User: { select: { name: true, avatar: true, phone: true } },
              Person: { select: { name: true, phone: true } },
            },
          },
          PharmacyOrderItem: {
            include: { PharmacyProduct: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.pharmacyProduct.findMany({
        where: { pharmacyId, isActive: true },
        orderBy: { stock: 'desc' },
        take: 30,
      }),
      prisma.pharmacyOrder.aggregate({
        where: {
          pharmacyId,
          createdAt: { gte: today },
          status: { in: ['RECEIVED', 'SEPARATING', 'DELIVERING', 'FINISHED'] },
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.quotationResponse.aggregate({
        where: {
          pharmacyId,
          status: { in: ['ACCEPTED', 'FINISHED'] },
          createdAt: { gte: today },
        },
        _sum: { price: true },
      }),
      prisma.quotationResponse.count({
        where: { pharmacyId, createdAt: { gte: today } },
      }),
      prisma.healthIntent.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
          intent: { in: ['QUOTE', 'PHARMACY', 'MEDICATION', 'INFO', 'EXAM', 'APPOINTMENT'] },
        },
      }),
      getPharmacyDemandHistory(pharmacyId),
    ]);

  const intentLeads = intents.map(normalizeHealthIntentLead);
  const quoteLeads = openQuotations.map((q: any) =>
    mapQuotationToLead({
      ...q,
      QuotationRequestItem: q.QuotationRequestItem,
      patient: q.patient,
    })
  );
  const wonLeads = (wonQuotations as any[]).map((r) => ({
    ...normalizeHealthIntentLead({
      id: r.id,
      intent: 'QUOTE',
      status: r.status,
      createdAt: r.createdAt,
      context: {
        item:
          r.quotation?.QuotationRequestItem?.map((i: { name: string }) => i.name).join(', ') ||
          'Cotação paga',
        description: 'Cotação ganha — separar e despachar',
      },
      patient: r.quotation?.patient,
    }),
    id: `won-${r.id}`,
    quotationId: r.quotationId,
    source: 'WON_QUOTE' as const,
  }));
  const orderLeads = pendingOrders.map(mapOrderToLead);

  const seen = new Set<string>();
  const leads = [...intentLeads, ...quoteLeads, ...wonLeads, ...orderLeads].filter((l) => {
    const key = (l as any).quotationId || (l as any).orderId || l.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  leads.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const interactionsLast7Days =
    intentsCount7d + openQuotations.length + pendingOrders.length + wonQuotations.length;

  const totalToday =
    Math.round(
      ((ordersTodayAgg._sum.total || 0) + (quotesTodayAgg._sum.price || 0)) * 100
    ) / 100;

  const keywordHints = leads
    .map((l) => `${l.context.item} ${l.context.description}`.toLowerCase())
    .join(' ');

  const suggestedProducts = products
    .map((p) => {
      let score = p.stock > 0 ? 1 : 0;
      const nameL = p.name.toLowerCase();
      const catL = p.category.toLowerCase();
      if (keywordHints.includes('higiene') && catL.includes('higiene')) score += 3;
      if (keywordHints.includes('antitérm') || keywordHints.includes('febre')) {
        if (nameL.includes('dipirona') || nameL.includes('paracetamol')) score += 3;
      }
      if (keywordHints.includes('amoxicilina') && nameL.includes('amox')) score += 4;
      if (keywordHints.includes('neosoro') && nameL.includes('soro')) score += 4;
      return {
        id: p.id,
        name: p.name,
        desc: p.description || p.brand || p.category,
        price: p.promotionPrice ?? p.price,
        category: p.category,
        stock: p.stock,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const fallbackSuggestions =
    suggestedProducts.length > 0
      ? suggestedProducts
      : products.slice(0, 4).map((p) => ({
          id: p.id,
          name: p.name,
          desc: p.description || p.category,
          price: p.promotionPrice ?? p.price,
          category: p.category,
          stock: p.stock,
          score: 0,
        }));

  const openQuotesCount = openQuotations.length;

  return {
    leads,
    totalToday,
    ordersToday: ordersTodayAgg._count,
    interactionsLast7Days,
    interactionsToday: intents.filter((i) => i.createdAt >= today).length,
    openQuotesCount: openQuotations.length,
    pendingOrdersCount: pendingOrders.length,
    wonPendingCount: wonQuotations.length,
    historyPreview: history.items.slice(0, 5),
    historySummary: history.summary,
    suggestedProducts: fallbackSuggestions,
    modules: [
      { label: 'Chat Integrado', active: true },
      { label: 'Leitura de Receita IA', active: true },
      { label: 'Venda Assistida', active: products.length > 0 },
      {
        label: 'Cotação Automática',
        active: openQuotesCount > 0 || myResponsesToday > 0,
      },
    ],
  };
}

export async function updatePharmacyLeadStatus(
  leadId: string,
  status: string
) {
  if (leadId.startsWith('quote-')) {
    throw new Error('Use a aba Cotações para responder demandas de cotação aberta.');
  }
  return prisma.quotationRequest.update({
    where: { id: leadId },
    data: { status, updatedAt: new Date() },
  });
}

export async function attendPharmacyLead(leadId: string) {
  if (leadId.startsWith('order-')) {
    const orderId = leadId.replace(/^order-/, '');
    return {
      orderId,
      navigateTo: '/pharmacy/pedidos?tab=orders',
      tab: 'orders' as const,
    };
  }
  if (leadId.startsWith('won-')) {
    const responseId = leadId.replace(/^won-/, '');
    return {
      responseId,
      navigateTo: '/pharmacy/cotacoes',
      tab: 'won' as const,
    };
  }
  if (leadId.startsWith('quote-')) {
    const quotationId = leadId.replace(/^quote-/, '');
    return { quotationId, navigateTo: '/pharmacy/cotacoes', tab: 'open' as const };
  }
  await updatePharmacyLeadStatus(leadId, 'CONTACTED');
  return { leadId, navigateTo: '/pharmacy/cotacoes', tab: 'open' as const };
}
