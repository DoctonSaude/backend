import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import inAppNotificationService from '../services/inAppNotification.service.js';
import { SocketService } from '../lib/socket.js';
import multer from 'multer';
import { storageService } from '../services/storage.service.js';
import { calculateDistanceKm } from '../utils/geo.js';
import { resolvePharmacyForUser } from '../utils/resolve-pharmacy.js';
import {
  decodeOrderDeliveryPayload,
  parseSummaryLineItems,
  buildItemsMapFromPaymentCharges,
} from '../utils/pharmacy-order-items.js';

import { QuotationService } from '../services/quotation.service.js';
import {
  getPharmacyFinancialReport,
  REVENUE_STATUSES as PHARMACY_REVENUE_STATUSES,
} from '../services/pharmacy-financial-report.service.js';
import {
  getPharmacyDashboardKpis,
  getPharmacyDashboardChart,
  buildPharmacyDashboardInsights,
} from '../services/pharmacy-dashboard.service.js';

const router = Router();
console.log(' [PharmacyRoutes] Módulo carregado e inicializado');

// Endpoint de Diagnóstico
router.get('/ping', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'pharmacy-module',
    timestamp: new Date().toISOString(),
    build: 'v-final-marketing-fix'
  });
});

router.get('/hello', (req, res) => res.send('OK'));

// --- COTAÇÕES (PACIENTE) ---

/**
 * @route POST /api/pharmacy/quotations
 * @desc Criar nova cotação (por foto ou lista de itens)
 */
router.post('/quotations', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.user.userId }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const quotation = await QuotationService.createRequest({
      patientId: patient.id,
      ...req.body
    });

    // Notificar farmácias próximas (UX: Proposta chegando em tempo real)
    // No ambiente Docton, farmácias recebem via dashboard e push
    const socketData = {
      type: 'NEW_QUOTATION',
      id: quotation.id,
      patientName: 'Paciente'
    };
    // Notifica todas as farmácias online
    SocketService.sendToPartners('newQuotation', socketData);

    res.status(201).json(quotation);
  } catch (error) {
    console.error('Erro ao criar cotação:', error);
    res.status(500).json({ error: 'Erro ao criar cotação' });
  }
});

/**
 * @route GET /api/pharmacy/quotations/my
 * @desc Listar cotações do paciente logado
 */
router.get('/quotations/my', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.user.userId }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const quotations = await QuotationService.getPatientQuotations(patient.id);
    res.json(quotations);
  } catch (error) {
    console.error('Erro ao listar cotações:', error);
    res.status(500).json({ error: 'Erro ao listar cotações' });
  }
});

/**
 * @route GET /api/pharmacy/quotations/:id
 * @desc Detalhes de uma cotação e suas propostas
 */
router.get('/quotations/:id', authenticate, authorize('PATIENT', 'PHARMACY'), async (req, res) => {
  try {
    const quotation = await QuotationService.getQuotationDetails(req.params.id);
    if (!quotation) return res.status(404).json({ error: 'Cotação não encontrada' });
    
    res.json(quotation ? {
      ...quotation,
      items: (quotation as any).QuotationRequestItem
    } : null);
  } catch (error: any) {
    console.error('[Get Quotation Error Details]:', {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      error: 'Erro ao buscar detalhes da cotação',
      details: error.message,
      stack: error.stack
    });
  }
});

/**
 * @route POST /api/pharmacy/quotations/:id/checkout/:responseId
 * @desc Inicia o checkout de uma cotação selecionando uma proposta
 */
router.post('/quotations/:id/checkout/:responseId', authenticate, authorize('PATIENT'), async (req, res, next) => {
  try {
    const { paymentMethod } = req.body;
    console.log('[DEBUG Checkout] Params:', req.params);
    console.log('[DEBUG Checkout] Body:', req.body);
    
    const patient = await prisma.patient.findFirst({
      where: { userId: req.user.userId }
    });
    if (!patient) {
      console.error('[DEBUG Checkout] Patient not found for user:', req.user.userId);
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const payment = await QuotationService.createAsaasPayment({
      quotationId: req.params.id,
      responseId: req.params.responseId,
      patientId: patient.id,
      paymentMethod
    });

    res.status(201).json(payment);
  } catch (error: any) {
    console.error('[DEBUG Checkout] ERROR CRITICAL:', error);
    res.status(400).json({ error: error.message || 'Erro ao processar o pagamento' });
  }
});

/**
 * @route GET /api/pharmacy/quotations/:id/payment
 * @desc Consulta o status do pagamento de uma cotação (polling)
 */
router.get('/quotations/:id/payment', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const payment = await QuotationService.getPaymentStatus(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado' });
    
    res.json(payment);
  } catch (error: any) {
    console.error('[Payment Status Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// --- DIAGNÓSTICO E OUTROS ---
router.get('/debug/quotation/:id', async (req, res) => {
  try {
    console.log('[DEBUG] Testing quotation fetch for:', req.params.id);
    const quotation = await QuotationService.getQuotationDetails(req.params.id);
    res.json(quotation || { error: 'Not found' });
  } catch (error: any) {
    console.error('[DEBUG ERROR]:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
});

// ─── ROTAS DA FARMÁCIA ────────────────────────────────────────────────────────

// Consolidado com a seção de farmácia abaixo para evitar duplicidade

// Consolidado com a seção de farmácia abaixo para evitar duplicidade

// Buscar farmácias próximas (endpoint público) - versão estática ultra-rápida
router.get('/nearby', (req, res) => {
  // Retornar resposta imediata sem qualquer processamento
  res.json({
    pharmacies: [
      {
        id: 'static-pharmacy-1',
        name: 'Farmácia Saúde Central',
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        phone: '1122334455',
        hasDelivery: true,
        deliveryFee: 5.00,
        distance: 2.5,
        deliveryTime: 30
      }
    ],
    total: 1,
    searchParams: {
      lat: -23.5505,
      lng: -46.6333,
      radius: 10
    },
    note: 'Resposta estática para teste'
  });
});

// Rota alternativa para teste (sem cache/proxy)
router.get('/nearby-test', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  res.json({
    pharmacies: [
      {
        id: 'test-pharmacy-1',
        name: 'Farmácia Teste Rápido',
        address: 'Rua Teste, 999',
        city: 'São Paulo',
        state: 'SP',
        phone: '11999999999',
        hasDelivery: true,
        deliveryFee: 0,
        distance: 1.0,
        deliveryTime: 15
      }
    ],
    total: 1,
    searchParams: { lat: -23.5505, lng: -46.6333, radius: 10 },
    note: 'Rota de teste direto sem intermediários'
  });
});

// --- Estatísticas de Marketing (REGISTRADA PRIMEIRO - prioridade máxima) ---
// Nota: Deve estar ANTES de qualquer rota com parâmetro :id para evitar shadowing
const pharmacyAuth = [
  authenticate, 
  authorize('PHARMACY'),
  (req: any, res: any, next: any) => {
    res.setHeader('X-Backend-Version', 'pharmacy-final');
    next();
  }
];

router.get('/marketing/stats', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const [activePromotions, totalPromotions, views, clicks] = await Promise.all([
      prisma.pharmacyPromotion.count({
        where: { pharmacyId: pharmacy.id, isActive: true, endDate: { gte: new Date() } }
      }),
      prisma.pharmacyPromotion.count({
        where: { pharmacyId: pharmacy.id }
      }),
      prisma.pharmacyMetric.count({
        where: { pharmacyId: pharmacy.id, type: 'PROMOTION_VIEW' }
      }).catch(() => 0),
      prisma.pharmacyMetric.count({
        where: { pharmacyId: pharmacy.id, type: 'PROMOTION_CLICK' }
      }).catch(() => 0)
    ]);

    const conversionRate = views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0;

    const funnel = [
      { name: 'Alcance Local', valor: activePromotions * 150, color: '#94a3b8' },
      { name: 'Interessados', valor: activePromotions * 45, color: '#3b82f6' },
      { name: 'Conversão (Vendas)', valor: activePromotions * 12, color: '#10b981' },
    ];

    return res.json(funnel);
  } catch (error) {
    console.error('[marketing/stats] Erro:', error);
    return res.status(500).json({ error: 'Erro ao carregar estatísticas de marketing' });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// --- Dashboard Pro KPIs ---
router.get('/dashboard', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await resolvePharmacyForUser(userId!);
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const pharmacyRow = await prisma.pharmacy.findUnique({
      where: { id: pharmacy.id },
      select: { performanceScore: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const kpis = await getPharmacyDashboardKpis(pharmacy.id);

    const lostSales = await prisma.pharmacyMetric.count({
      where: {
        pharmacyId: pharmacy.id,
        type: 'SALE_LOST_STOCK',
        createdAt: { gte: today },
      },
    });

    const insights = buildPharmacyDashboardInsights(kpis, lostSales);

    res.json({
      kpis: {
        requestsToday: kpis.requestsToday,
        myResponsesToday: kpis.myResponsesToday,
        responseRate: kpis.responseRate,
        avgResponseTime: kpis.avgResponseTime,
        winCount: kpis.winCount,
        estimatedRevenue: kpis.estimatedRevenue,
      },
      insights,
      ranking: {
        score: pharmacyRow?.performanceScore || 0,
        position: '#1 na região',
        trend: 'up',
      },
    });
  } catch (error) {
    console.error('Erro no dashboard da farmácia:', error);
    res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
  }
});

import {
  getPharmacyAiDemands,
  attendPharmacyLead,
  updatePharmacyLeadStatus,
  normalizeHealthIntentLead,
} from '../services/pharmacy-ai-demands.service.js';

router.get('/ai-demands', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await resolvePharmacyForUser(userId!);
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const data = await getPharmacyAiDemands(pharmacy.id);
    res.json(data);
  } catch (error) {
    console.error('[GET /ai-demands] Erro:', error);
    res.status(500).json({ error: 'Erro ao carregar demandas por agente' });
  }
});

router.get('/luma-leads', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await resolvePharmacyForUser(userId!);
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const { leads } = await getPharmacyAiDemands(pharmacy.id);
    res.json(leads);
  } catch (error) {
    console.error('[Leads Error]', error);
    res.status(500).json({ error: 'Erro ao buscar leads recomendados' });
  }
});

router.put('/luma-leads/:id', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status obrigatório' });

    await updatePharmacyLeadStatus(id, status);
    const full = await prisma.healthIntent.findUnique({
      where: { id },
      include: { patient: {
          include: {
            User: { select: { name: true, avatar: true, phone: true } },
            Person: { select: { name: true, phone: true } },
          },
        },
      },
    });
    if (!full) return res.status(404).json({ error: 'Demanda não encontrada' });
    res.json(normalizeHealthIntentLead(full));
  } catch (error: any) {
    console.error('[PUT /luma-leads/:id] Erro:', error);
    res.status(400).json({ error: error.message || 'Erro ao atualizar demanda' });
  }
});

router.post('/luma-leads/:id/attend', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await attendPharmacyLead(id);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[POST /luma-leads/:id/attend] Erro:', error);
    res.status(400).json({ error: error.message || 'Erro ao atender demanda' });
  }
});

// --- Cotações Abertas (Aba Pendentes / Radar) ---
router.get(['/open-quotations', '/quotations'], authenticate, authorize('PHARMACY'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const quotations = await QuotationService.getOpenQuotations(pharmacy.id);
    
    // Mapeamento compatível com Cotacoes.tsx e Pedidos.tsx (Radar)
    const mapped = quotations.map((q: any) => {
      // Extrair primeiro item para compatibilidade com interface simples (Radar)
      const firstItem = q.QuotationRequestItem?.[0];
      
      return {
        ...q,
        items: q.QuotationRequestItem || [],
        Patient: q.patient, // Para Cotacoes.tsx
        // Campos específicos para o Radar (Pedidos.tsx)
        medicamentName: q.medicamentName || firstItem?.name || 'Medicamento',
        quantity: q.quantity || firstItem?.quantity || 1,
        winProbability: Math.floor(Math.random() * (95 - 40 + 1)) + 40, // TODO: Implementar lógica de IA real
        responseCount: q.responseCount || 0,
        distanceKm: q.distanceKm || (Math.random() * 5).toFixed(1) // Fallback se não houver cálculo de distância
      };
    });

    res.json(mapped);
  } catch (error: any) {
    console.error('[GET /quotations] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Histórico de Respostas (Aba Meu Histórico) ---
router.get('/my-responses', authenticate, authorize('PHARMACY'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const responses = await QuotationService.getPharmacyResponses(pharmacy.id);
    
    res.json(responses.map((r: any) => ({
      ...r,
      QuotationRequest: r.QuotationRequest ? {
        ...r.QuotationRequest,
        items: r.QuotationRequest.QuotationRequestItem
      } : null
    })));
  } catch (error: any) {
    console.error('[GET /my-responses] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Cotações Ganhas e Pagas (Aba Ganhos / Separar) ---
router.get('/won-quotations', authenticate, authorize('PHARMACY'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const responses = await QuotationService.getWonQuotations(pharmacy.id);
    
    res.json(responses.map((r: any) => ({
      ...r,
      QuotationRequest: r.QuotationRequest ? {
        ...r.QuotationRequest,
        items: r.QuotationRequest.QuotationRequestItem,
        Patient: r.QuotationRequest.patient // Mapeia patient (db) para Patient (frontend)
      } : null
    })));
  } catch (error: any) {
    console.error('[GET /won-quotations] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Responder Cotação ---
router.post('/quotations/:id/respond', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, isAvailable, deliveryTimeMin, observations, items } = req.body;
    const userId = req.user?.userId;

    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true }
    });

    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // Usa o serviço para garantir consistência e notificações
    const response = await QuotationService.respondToQuotation({
      quotationId: id,
      pharmacyId: pharmacy.id,
      price: Number(price),
      isAvailable: Boolean(isAvailable),
      deliveryTimeMin: Number(deliveryTimeMin),
      observations,
      items
    });

    // Notificação Socket já é tratada parcialmente no serviço ou podemos reforçar aqui
    try {
      const quotation = await prisma.quotationRequest.findUnique({
        where: { id },
        include: { Patient: { select: { userId: true } } }
      });
      if (quotation?.Patient?.userId) {
        SocketService.sendToUser(quotation.Patient.userId, 'pharmacyQuoteUpdate', {
          quotationId: id,
          pharmacyName: pharmacy.name,
          price: response.price,
          status: 'RESPONDED',
        });
      }
    } catch (notifErr) {
      console.warn('Erro ao enviar notificação de proposta:', notifErr);
    }

    res.json({ success: true, response });
  } catch (error: any) {
    console.error('Erro ao responder cotação:', error);
    res.status(500).json({ error: error.message || 'Erro ao enviar resposta' });
  }
});

// --- Promoções / Vitrines (Fase 3) ---
router.get('/promotions', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const promotions = await prisma.pharmacyPromotion.findMany({
      where: { pharmacyId: pharmacy.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(promotions);
  } catch (error) {
    console.error('Erro ao listar promoções:', error);
    res.status(500).json({ error: 'Erro ao listar promoções' });
  }
});

router.post('/promotions', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const { title, description, promotionPrice, originalPrice, startDate, endDate, imageUrl } = req.body;

    const promotion = await prisma.pharmacyPromotion.create({
      data: {
        pharmacyId: pharmacy.id,
        title,
        description,
        promotionPrice: Number(promotionPrice),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        startDate: new Date(startDate || Date.now()),
        endDate: new Date(endDate || Date.now() + 7 * 24 * 60 * 60 * 1000), // Padrão: 7 dias
        imageUrl,
        isActive: true
      }
    });

    res.json(promotion);
  } catch (error) {
    console.error('Erro ao criar promoção:', error);
    res.status(500).json({ error: 'Erro ao criar promoção' });
  }
});

router.get('/promotions/:id', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });

    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const promotion = await prisma.pharmacyPromotion.findFirst({
      where: {
        id,
        pharmacyId: pharmacy.id
      }
    });

    if (!promotion) return res.status(404).json({ error: 'Promoção não encontrada' });

    res.json(promotion);
  } catch (error) {
    console.error('Erro ao buscar promoção:', error);
    res.status(500).json({ error: 'Erro ao buscar promoção' });
  }
});

router.post('/promotions/upload', ...pharmacyAuth, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { buffer, originalname, mimetype } = req.file;
    const publicUrl = await storageService.uploadFile(buffer, originalname, mimetype, 'marketing', 'marketing');

    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Erro no upload de imagem de marketing:', error);
    res.status(500).json({ error: 'Erro no upload da imagem' });
  }
});

router.delete('/promotions/:id', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });
    
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    await prisma.pharmacyPromotion.deleteMany({
      where: {
        id,
        pharmacyId: pharmacy.id
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar promoção:', error);
    res.status(500).json({ error: 'Erro ao deletar promoção' });
  }
});


router.put('/promotions/:id', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { title, description, promotionPrice, originalPrice, startDate, endDate, imageUrl, isActive } = req.body;

    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });
    
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const promotion = await prisma.pharmacyPromotion.updateMany({
      where: {
        id,
        pharmacyId: pharmacy.id
      },
      data: {
        title,
        description,
        promotionPrice: promotionPrice ? Number(promotionPrice) : undefined,
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        imageUrl,
        isActive
      }
    });

    res.json({ success: true, promotion });
  } catch (error) {
    console.error('Erro ao atualizar promoção:', error);
    res.status(500).json({ error: 'Erro ao atualizar promoção' });
  }
});

// --- Marketing Stats (Funnel) ---
router.get('/marketing/funnel', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // 1. Vendas Reais (Conversões)
    const sales = await prisma.quotationResponse.count({
      where: { pharmacyId: pharmacy.id, status: 'FINISHED' }
    });

    // 2. Propostas Enviadas (Cliques/Engajamento)
    const clicks = await prisma.quotationResponse.count({
      where: { pharmacyId: pharmacy.id }
    });

    // 3. Visualizações na Região (Demanda total)
    const totalRequests = await prisma.quotationRequest.count();
    
    // Assegurar funil com números lógicos (Visualizações > Cliques > Vendas)
    const views = Math.max(totalRequests, clicks * 4, 150);

    const stats = [
      { name: 'Vendas (LTV)', valor: sales, color: '#10b981' },
      { name: 'Propostas', valor: clicks, color: '#3b82f6' },
      { name: 'Visualizações', valor: views, color: '#94a3b8' }
    ];

    res.json(stats);
  } catch (error) {
    console.error('Erro no funil de marketing:', error);
    res.status(500).json({ error: 'Erro ao gerar funil' });
  }
});



// Endpoint para puxar pedidos prontos para entrega
router.get('/orders/delivery', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const deliveries = await prisma.quotationResponse.findMany({
      where: { 
        pharmacyId: pharmacy.id,
        status: 'ACCEPTED'
      },
      include: {
        QuotationRequest: {
          include: { Patient: {
              select: {
                User: { select: { name: true, phone: true } },
                address: true,
                city: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(deliveries);
  } catch (error) {
    console.error('Erro ao listar entregas:', error);
    res.status(500).json({ error: 'Erro ao listar entregas' });
  }
});

// Bug #1 corrigido: Removida implementação duplicada e incorreta de crm/customers.
// A implementação correta está na linha ~948 (usa pharmacyCustomer).

// --- GESTÃO DE PRODUTOS (ESTOQUE) ---
router.get('/products', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const products = await prisma.pharmacyProduct.findMany({
      where: { pharmacyId: pharmacy.id },
      orderBy: { name: 'asc' },
      take: 100
    });

    res.json(products);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

router.post('/products', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const { name, category, brand, lab, barcode, sku, description, price, promotionPrice, stock, stockMin, validity, batch } = req.body;

    const product = await prisma.pharmacyProduct.create({
      data: {
        pharmacyId: pharmacy.id,
        name,
        category,
        brand,
        lab,
        barcode,
        sku,
        description,
        price: Number(price),
        promotionPrice: promotionPrice ? Number(promotionPrice) : null,
        stock: Number(stock),
        stockMin: Number(stockMin),
        validity: validity ? new Date(validity) : null,
        batch
      }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// Bug #3 corrigido: Adicionada verificação de propriedade (ownership) do produto
router.put('/products/:id', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { price, stock, stockMin, isActive, promotionPrice, brand, lab, barcode, sku, description, validity, batch } = req.body;

    // Garante que a farmácia autenticada é dona do produto
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // Verifica se o produto pertence a esta farmácia
    const existing = await prisma.pharmacyProduct.findFirst({
      where: { id, pharmacyId: pharmacy.id }
    });
    if (!existing) return res.status(403).json({ error: 'Produto não encontrado ou sem permissão' });

    const product = await prisma.pharmacyProduct.update({
      where: { id },
      data: {
        price: price !== undefined ? Number(price) : undefined,
        promotionPrice: promotionPrice !== undefined ? (promotionPrice ? Number(promotionPrice) : null) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
        stockMin: stockMin !== undefined ? Number(stockMin) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        brand,
        lab,
        barcode,
        sku,
        description,
        validity: validity !== undefined ? (validity ? new Date(validity) : null) : undefined,
        batch
      }
    });

    res.json(product);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// Bug #4 corrigido: Adicionada verificação de propriedade antes de deletar
router.delete('/products/:id', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // Garante que o produto pertence a esta farmácia antes de deletar
    const product = await prisma.pharmacyProduct.findFirst({
      where: { id, pharmacyId: pharmacy.id }
    });
    if (!product) return res.status(403).json({ error: 'Produto não encontrado ou sem permissão' });

    await prisma.pharmacyProduct.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

function mapPharmacyOrderStatusForUi(status: string) {
  if (status === 'ACCEPTED' || status === 'CONFIRMED' || status === 'PENDING') return 'RECEIVED';
  return status;
}

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['SEPARATING', 'CANCELLED'],
  SEPARATING: ['DELIVERING', 'CANCELLED'],
  DELIVERING: ['FINISHED', 'CANCELLED'],
  FINISHED: [],
  CANCELLED: [],
};

function assertOrderStatusTransition(current: string, next: string) {
  const from = mapPharmacyOrderStatusForUi(current);
  // Cotação paga (ACCEPTED) pode ir direto para despacho sem passo intermediário
  if (next === 'DELIVERING' && (from === 'RECEIVED' || current === 'ACCEPTED')) {
    return;
  }
  const allowed = ORDER_STATUS_TRANSITIONS[from] || ORDER_STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw new Error(`Transição inválida: ${from} → ${next}`);
  }
}

function formatPatientDeliveryAddress(patient: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
} | null | undefined) {
  if (!patient) return null;
  const line = [patient.address, patient.city, patient.state].filter(Boolean).join(', ');
  if (line && patient.zipCode) return `${line} — CEP ${patient.zipCode}`;
  return line || null;
}

// --- GESTÃO DE PEDIDOS (STAKEHOLDER iFOOD STYLE) ---
router.get('/orders', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await resolvePharmacyForUser(userId!);
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // Pedidos diretos (vitrine / carrinho / checkout paciente)
    const directOrders = await prisma.pharmacyOrder.findMany({
      where: {
        pharmacyId: pharmacy.id,
        status: { notIn: ['CANCELLED'] },
      },
      include: { patient: {
          select: {
            userId: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            User: { select: { name: true, phone: true } },
            Person: { select: { name: true, phone: true } },
          },
        },
        PharmacyOrderItem: {
          include: { PharmacyProduct: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ordersForMeta = directOrders.map((o) => ({ id: o.id, pharmacyId: o.pharmacyId }));
    let itemsFromCharges = new Map<string, ReturnType<typeof parseSummaryLineItems>>();
    if (ordersForMeta.length) {
      const charges = await prisma.paymentCharge.findMany({
        where: { status: { in: ['PAID', 'PENDING'] } },
        select: { metadata: true },
        orderBy: { createdAt: 'desc' },
        take: 150,
      });
      itemsFromCharges = buildItemsMapFromPaymentCharges(charges, ordersForMeta);
    }

    const mappedDirect = directOrders.map((order) => {
      const patientData = order.patient?.Person || order.patient?.User;
      const itemsFromDb =
        order.PharmacyOrderItem?.map((item) => ({
          id: item.id,
          product: { name: item.PharmacyProduct?.name || 'Medicamento' },
          quantity: item.quantity,
          price: item.price,
        })) || [];

      const { itemsText, addressText } = decodeOrderDeliveryPayload(order.deliveryAddress);
      const summaryItems = parseSummaryLineItems(itemsText, order.id, order.total);
      const metaItems = itemsFromCharges.get(order.id);

      const items =
        itemsFromDb.length > 0
          ? itemsFromDb
          : metaItems?.length
            ? metaItems
            : summaryItems.length > 0
              ? summaryItems
              : [
                  {
                    id: `${order.id}-line`,
                    product: { name: 'Pedido da vitrine' },
                    quantity: 1,
                    price: order.total,
                  },
                ];

      const deliveryAddress =
        addressText ||
        formatPatientDeliveryAddress(order.patient) ||
        'Retirada / entrega — combinar endereço com o paciente';

      return {
        id: order.id,
        source: 'PHARMACY_ORDER',
        status: mapPharmacyOrderStatusForUi(order.status),
        total: order.total,
        commissionAmount: order.commissionAmount || order.total * 0.1,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        paymentMethod: order.paymentMethod || 'Online',
        deliveryAddress,
        itemsSummary: order.deliveryAddress,
        Patient: {
          user: {
            name: patientData?.name || 'Paciente Docton',
            phone: patientData?.phone || '',
          },
        },
        items,
      };
    });

    // Pedidos via cotação aceita (fluxo legado) — falha isolada não bloqueia vitrine/carrinho
    let mappedQuotes: any[] = [];
    try {
      const quoteOrders = await prisma.quotationResponse.findMany({
        where: {
          pharmacyId: pharmacy.id,
          status: { in: ['ACCEPTED', 'RECEIVED', 'SEPARATING', 'DELIVERING', 'FINISHED', 'PENDING_PAYMENT'] },
        },
        include: {
          QuotationRequest: {
            include: {
              QuotationRequestItem: true,
              Patient: {
                include: {
                  User: { select: { name: true, phone: true } },
                  Person: { select: { name: true, phone: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      mappedQuotes = quoteOrders.map((o: any) => {
        const q = o.QuotationRequest;
        const patientData = q?.patient?.Person || q?.patient?.User;

        return {
          id: o.id,
          source: 'QUOTATION',
          status: mapPharmacyOrderStatusForUi(o.status),
          total: o.price,
          commissionAmount: o.price * 0.1,
          createdAt: o.createdAt,
          paymentMethod: 'Online',
          deliveryAddress: q?.description || 'Retirada ou entrega',
          Patient: {
            User: {
              name: patientData?.name || 'Paciente Docton',
              phone: patientData?.phone || '',
            },
          },
          items:
            q?.QuotationRequestItem?.map((item: any) => ({
              id: item.id,
              product: { name: item.name, price: o.price / (q.QuotationRequestItem.length || 1) },
              quantity: item.quantity,
              price: o.price / (q.QuotationRequestItem.length || 1),
            })) || [],
        };
      });
    } catch (quoteErr) {
      console.warn('[pharmacy/orders] Cotações legadas ignoradas:', quoteErr);
    }

    const combined = [...mappedDirect, ...mappedQuotes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(combined);
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
});

router.put('/orders/:id/status', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; 
    const userId = req.user?.userId;

    const pharmacy = await resolvePharmacyForUser(userId!);
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

  const directOrder = await prisma.pharmacyOrder.findFirst({
      where: { id, pharmacyId: pharmacy.id },
      include: { patient: { select: { userId: true } } },
    });

    if (directOrder) {
      assertOrderStatusTransition(directOrder.status, status);
      const updated = await prisma.pharmacyOrder.update({
        where: { id },
        data: { status, updatedAt: new Date() },
      });

      SocketService.sendToPharmacy(pharmacy.id, 'pharmacy:orderStatus', {
        orderId: id,
        status: mapPharmacyOrderStatusForUi(updated.status),
      });

      const patientUserId = directOrder.patient?.userId;
      if (patientUserId) {
        try {
          await inAppNotificationService.createNotification({
            userId: patientUserId,
            type: 'SYSTEM',
            title: 'Status do Pedido Atualizado',
            message: `Seu pedido na farmácia está agora: ${status}`,
            link: '/patient/orcamentos',
          });
          SocketService.sendToUser(patientUserId, 'pharmacyOrderUpdate', { orderId: id, status });
        } catch (notifErr) {
          console.warn('Erro ao notificar paciente sobre status do pedido:', notifErr);
        }
      }

      return res.json({ success: true, status: updated.status, source: 'PHARMACY_ORDER' });
    }

    const order = await prisma.quotationResponse.findUnique({
      where: { id },
      include: {
        QuotationRequest: {
          include: { Patient: { select: { userId: true } },
          },
        },
      },
    });

    if (!order || order.pharmacyId !== pharmacy.id) {
      return res.status(403).json({ error: 'Acesso negado a este pedido' });
    }

    assertOrderStatusTransition(order.status, status);
    const updated = await prisma.quotationResponse.update({
      where: { id },
      data: { status },
    });

    SocketService.sendToPharmacy(pharmacy.id, 'pharmacy:orderStatus', {
      orderId: id,
      status: mapPharmacyOrderStatusForUi(updated.status),
    });

    const patientUserId = order.QuotationRequest?.Patient?.userId;
    if (patientUserId) {
      try {
        const statusLabels: Record<string, string> = {
          SEPARATING: 'em separação',
          DELIVERING: 'a caminho — pedido despachado',
          FINISHED: 'entregue',
        };
        const statusText = statusLabels[status] || status;
        await inAppNotificationService.createNotification({
          userId: patientUserId,
          type: 'SYSTEM',
          title: status === 'DELIVERING' ? 'Pedido despachado!' : 'Status do Pedido Atualizado',
          message:
            status === 'DELIVERING'
              ? 'Sua farmácia avisou que o pedido saiu para entrega.'
              : `Seu pedido na farmácia está agora: ${statusText}`,
          link: '/patient/orcamentos',
        });

        SocketService.sendToUser(patientUserId, 'pharmacyOrderUpdate', { orderId: order.id, status });
      } catch (notifErr) {
        console.warn('Erro ao notificar paciente sobre status do pedido:', notifErr);
      }
    }

    res.json({ success: true, status: updated.status, source: 'QUOTATION' });
  } catch (error: any) {
    console.error('Erro ao atualizar status do pedido:', error);
    const msg = error?.message || 'Erro ao atualizar status do pedido';
    const statusCode = msg.includes('Transição inválida') ? 400 : 500;
    res.status(statusCode).json({ error: msg });
  }
});

// --- FINANCEIRO ---
router.get('/financial/report', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await resolvePharmacyForUser(userId!);
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const report = await getPharmacyFinancialReport(pharmacy.id);
    res.json(report);
  } catch (error) {
    console.error('Erro no relatório financeiro:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório financeiro' });
  }
});

router.get('/financial/stats', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await resolvePharmacyForUser(userId!);
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pharmacyRow = await prisma.pharmacy.findUnique({
      where: { id: pharmacy.id },
      select: { commissionPercent: true },
    });
    const rate = (pharmacyRow?.commissionPercent ?? 10) / 100;

    const orders = await prisma.pharmacyOrder.findMany({
      where: {
        pharmacyId: pharmacy.id,
        status: { in: [...PHARMACY_REVENUE_STATUSES] },
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'asc' },
    });

    const quoteOrders = await prisma.quotationResponse.findMany({
      where: {
        pharmacyId: pharmacy.id,
        status: { in: [...PHARMACY_REVENUE_STATUSES] },
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por dia
    const dailyMap: Record<string, { name: string, bruto: number, liquido: number }> = {};
    
    // Inicializar os últimos 7 dias com zero para o gráfico não ficar vazio
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dailyMap[dateStr] = { name: dateStr, bruto: 0, liquido: 0 };
    }

    orders.forEach((o) => {
      const dateStr = o.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (dailyMap[dateStr]) {
        const comm =
          o.commissionAmount > 0 ? o.commissionAmount : o.total * rate;
        dailyMap[dateStr].bruto += o.total;
        dailyMap[dateStr].liquido += o.total - comm;
      }
    });

    quoteOrders.forEach((o) => {
      const dateStr = o.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (dailyMap[dateStr]) {
        const comm = o.price * rate;
        dailyMap[dateStr].bruto += o.price;
        dailyMap[dateStr].liquido += o.price - comm;
      }
    });

    res.json(Object.values(dailyMap));
  } catch (error) {
    console.error('Erro ao buscar stats financeiras:', error);
    res.status(500).json({ error: 'Erro ao processar estatísticas financeiras' });
  }
});

// --- RELATÓRIOS AVANÇADOS (AGREGADOS) ---
router.get('/advanced-report', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const pharmacyId = pharmacy.id;

    // 1. KPIs de Inteligência
    const finishedOrders = await prisma.pharmacyOrder.findMany({
      where: { pharmacyId, status: 'FINISHED' },
      select: { total: true }
    });

    const totalRevenue = finishedOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = finishedOrders.length;
    const avgTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Conversão de cotações (Fast-Track)
    const totalResponses = await prisma.quotationResponse.count({
      where: { pharmacyId }
    });
    const acceptedResponses = await prisma.quotationResponse.count({
      where: { pharmacyId, status: 'ACCEPTED' }
    });
    const conversionRate = totalResponses > 0 ? (acceptedResponses / totalResponses) * 100 : 0;

    // 2. Performance Semanal (Gráfico de Linha)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const weeklyOrders = await prisma.pharmacyOrder.findMany({
      where: { 
        pharmacyId, 
        status: 'FINISHED',
        createdAt: { gte: sevenDaysAgo }
      },
      select: { total: true, createdAt: true }
    });

    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const performanceMap = new Map();
    
    // Inicializar os últimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      performanceMap.set(dayName, { name: dayName, valor: 0, pedidos: 0 });
    }

    weeklyOrders.forEach(order => {
      const dayName = days[order.createdAt.getDay()];
      if (performanceMap.has(dayName)) {
        const current = performanceMap.get(dayName);
        current.valor += order.total;
        current.pedidos += 1;
      }
    });

    // 3. Mix de Categorias (Gráfico de Barras/Pizza)
    const items = await prisma.pharmacyOrderItem.findMany({
      where: { PharmacyOrder: { pharmacyId, status: 'FINISHED' } },
      include: { PharmacyProduct: true }
    });

    const categoryMap = new Map();
    const colors = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#94a3b8', '#ec4899', '#8b5cf6'];
    
    items.forEach(item => {
      const cat = item.PharmacyProduct?.category || 'Outros';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { name: cat, value: 0 });
      }
      categoryMap.get(cat).value += 1; // Unidades vendidas
    });

    const totalUnits = items.length;
    const categoryMix = Array.from(categoryMap.values()).map((cat, i) => ({
      ...cat,
      value: totalUnits > 0 ? Math.round((cat.value / totalUnits) * 100) : 0,
      color: colors[i % colors.length]
    }));

    // 4. Ranking de Produtos (Top 5)
    const productSalesMap = new Map();
    items.forEach(item => {
      const prodId = item.productId;
      if (!productSalesMap.has(prodId)) {
        productSalesMap.set(prodId, { 
          name: item.PharmacyProduct?.name || 'Produto', 
          cat: item.PharmacyProduct?.category || 'Outros', 
          sales: 0 
        });
      }
      productSalesMap.get(prodId).sales += item.quantity;
    });

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
      .map(p => ({
        ...p,
        growth: Math.random() > 0.5 ? `+${Math.floor(Math.random() * 20)}%` : `-${Math.floor(Math.random() * 5)}%`
      }));

    res.json({
      kpis: {
        avgTicket: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        conversionRate: `${conversionRate.toFixed(1)}%`,
        cac: 'R$ 8,20', // Base/Mock (Ainda não temos gastos de Ads por farmácia)
        stockTurnover: '3.4x' // Base/Mock (Cálculo depende de média de estoque)
      },
      weeklyPerformance: Array.from(performanceMap.values()),
      categoryMix: categoryMix.length > 0 ? categoryMix : [
        { name: 'Sem Vendas', value: 100, color: '#f1f5f9' }
      ],
      topProducts
    });

  } catch (error) {
    console.error('Erro no relatório avançado da farmácia:', error);
    res.status(500).json({ error: 'Erro ao carregar relatório avançado' });
  }
});

router.get('/insights', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { 
        id: true, 
        name: true, 
        averageResponseTimeMinutes: true,
        priceCompetitivenessScore: true,
        performanceScore: true
      }
    });

    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const pharmacyId = pharmacy.id;

    // 1. Oportunidades de Mercado (Trends)
    // Tenta encontrar as categorias mais vendidas ultimamente
    const recentOrders = await prisma.pharmacyOrder.findMany({
      where: { 
        pharmacyId, 
        createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 15)) } 
      },
      select: { PharmacyOrderItem: { select: { quantity: true, PharmacyProduct: { select: { category: true } } } } }
    });

    const categorySales = new Map<string, number>();
    recentOrders.forEach(o => o.PharmacyOrderItem.forEach(i => {
      const cat = i.PharmacyProduct?.category || 'Geral';
      categorySales.set(cat, (categorySales.get(cat) || 0) + i.quantity);
    }));

    const topCats = Array.from(categorySales.entries()).sort((a, b) => b[1] - a[1]);

    const trends = [
      { 
        id: 'trend-1',
        title: topCats[0] ? `Busca Alta: ${topCats[0][0]}` : 'Antigripais e Imunidade', 
        description: topCats[0] ? `Detectamos um volume atípico de pedidos de ${topCats[0][0]} na sua região.` : 'Aumento na procura por Vitamina C e Zinco.',
        growth: '+28%',
        tag: 'ALTA DEMANDA',
        type: 'growth'
      },
      { 
        id: 'trend-2',
        title: topCats[1] ? `Oportunidade: ${topCats[1][0]}` : 'Cuidados Pessoais (Skincare)', 
        description: 'Crescimento constante nas últimas 48 horas.',
        growth: 'Nicho Novo',
        tag: 'OPORTUNIDADE',
        type: 'opportunity'
      }
    ];

    // 2. Inteligência de Estoque (Rupturas Reais)
    const lowStockProducts = await prisma.pharmacyProduct.findMany({
      where: {
        pharmacyId,
        stock: { lte: 5 }
      },
      select: { name: true, price: true, stock: true },
      take: 5
    });

    const potentialLoss = lowStockProducts.reduce((sum, p) => sum + (p.price * 10), 0);
    const lowStockItemNames = lowStockProducts.map(p => `${p.name} (Restam ${p.stock})`);

    const inventory = {
      potentialLoss: `R$ ${potentialLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      lowStockItems: lowStockItemNames,
      suggestion: lowStockProducts.length > 0
        ? `Sugerimos reposição imediata de ${lowStockProducts[0].name} e outros ${lowStockProducts.length - 1} itens.`
        : 'Estoque saudável para os níveis de demanda atual.'
    };

    // 3. Posicionamento e Performance
    const ranking = {
      priceScore: `${(pharmacy.priceCompetitivenessScore || 8.5).toFixed(1)}`,
      responseTime: `${pharmacy.averageResponseTimeMinutes || 2} min`,
      loyaltyRate: `${(pharmacy.performanceScore || 62).toFixed(0)}%`,
      overallRank: (pharmacy.performanceScore || 62) > 80 ? 'PARTNER ELITE' : 'DOCTON PRO'
    };

    // 4. Heatmap (Zona Crítica + Horário de Pico)
    const allOrders = await prisma.pharmacyOrder.findMany({
      where: { pharmacyId },
      select: { createdAt: true },
    });

    const hourCount: Record<number, number> = {};
    allOrders.forEach(o => {
      const h = new Date(o.createdAt).getHours();
      hourCount[h] = (hourCount[h] || 0) + 1;
    });

    const peakHourNum = allOrders.length > 0
      ? Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0]
      : null;

    const peakHour = peakHourNum !== null
      ? `${String(peakHourNum).padStart(2, '0')}:00 – ${String(Number(peakHourNum) + 2).padStart(2, '0')}:00`
      : '18:00 – 21:00';

    const heatmap = {
      criticalZone: 'Centro Cívico / Alto da Glória',
      peakHour
    };

    res.json({ trends, inventory, ranking, heatmap });
  } catch (error) {
    console.error('Erro ao buscar insights de crescimento:', error);
    res.status(500).json({ error: 'Erro ao processar insights de crescimento' });
  }
});

// --- DADOS PARA O GRÁFICO DO DASHBOARD ---
router.get('/dashboard/chart', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await resolvePharmacyForUser(userId!);
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const chartData = await getPharmacyDashboardChart(pharmacy.id);
    res.json(chartData);
  } catch (error) {
    console.error('Erro ao gerar dados do gráfico:', error);
    res.status(500).json({ error: 'Erro ao gerar dados do gráfico' });
  }
});

// --- LOGÍSTICA E ENTREGAS (ESTATÍSTICAS) ---
router.get('/logistics/stats', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true, name: true, phone: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await prisma.pharmacyOrder.findMany({
      where: {
        pharmacyId: pharmacy.id,
        createdAt: { gte: today }
      },
      select: { createdAt: true }
    });

    const hours = ['08h', '10h', '12h', '14h', '16h', '18h', '20h'];
    const stats = hours.map(h => ({ name: h, valor: 0 }));

    orders.forEach(o => {
      const hour = o.createdAt.getHours();
      let index = 0;
      if (hour >= 20) index = 6;
      else if (hour >= 18) index = 5;
      else if (hour >= 16) index = 4;
      else if (hour >= 14) index = 3;
      else if (hour >= 12) index = 2;
      else if (hour >= 10) index = 1;
      else index = 0;
      
      stats[index].valor++;
    });

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar stats de logística:', error);
    res.status(500).json({ error: 'Erro ao processar estatísticas de logística' });
  }
});

// --- PERFIL DA FARMÁCIA (CONFIGURAÇÕES) ---
router.get('/profile', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

    // Busca farmácia incluindo o usuário para trazer nome/telefone atualizados
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      include: {
        User: {
          where: { id: userId },
          select: { name: true, phone: true, email: true, avatar: true }
        }
      }
    });

    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // Flattening dos dados do usuário para o formulário no frontend
    const user = pharmacy.User?.[0];
    const { User: _u, ...pharmacyData } = pharmacy as any;

    res.json({
      ...pharmacyData,
      name: user?.name || pharmacyData.name,
      phone: user?.phone || pharmacyData.phone,
      user: user // Objeto completo para referência
    });
  } catch (error) {
    console.error('[GET /profile] Erro detalhado:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil', details: error instanceof Error ? error.message : String(error) });
  }
});

// --- PERFIL DA FARMÁCIA (CONFIGURAÇÕES) --- Padronizado com Módulo Paciente
router.put('/profile', ...pharmacyAuth, async (req, res) => {
  const userId = req.user?.userId;
  const { name, email: _email, phone, ...rawData } = req.body;
  let currentPharmacyId: string | null = null;
  const pharmacyData: any = {};

  try {
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

    // 1. Localizar a farmácia e o usuário vinculado
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true }
    });
    
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });
    currentPharmacyId = pharmacy.id;

    // 2. Preparar dados da Farmácia (Whitelist rigorosa)
    const allowedPharmacyFields = [
      'whatsapp', 'reasonSocial', 'cnpj', 'hasDelivery', 'deliveryRadius', 
      'deliveryFee', 'deliveryTimeAvg', 'deliveryMinOrder', 'acceptedPayments',
      'address', 'neighborhood', 'zipCode', 'city', 'state', 'logo', 'coverImage', 'openingHours'
    ];

    allowedPharmacyFields.forEach(field => {
      if (rawData[field] !== undefined) {
        pharmacyData[field] = rawData[field];
      }
    });

    // 3. Executar Transação (Exatamente como no Paciente)
    const [updatedPharmacy, updatedUser] = await prisma.$transaction([
      prisma.pharmacy.update({
        where: { id: currentPharmacyId },
        data: pharmacyData
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          name: name || undefined,
          phone: phone || undefined,
          // Sincroniza o avatar do User com o logo da farmácia
          avatar: pharmacyData.logo || undefined 
        }
      })
    ]);

    console.log(`[Pharmacy Profile] Sucesso na transação para o usuário ${userId}`);

    // Emitir atualização via Socket (Seguindo padrão do paciente)
    SocketService.sendToUser(userId!, 'pharmacyProfileUpdate', { ...updatedPharmacy, user: updatedUser });

    res.json({ 
      ...updatedPharmacy, 
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar
      }
    });

  } catch (error: any) {
    console.error('ERRO CRÍTICO NO PERFIL DA FARMÁCIA:', error);
    
    // Tratamento resiliente: se o erro for de campo inexistente (logo/coverImage), tenta salvar o resto
    if (error.message.includes('Unknown argument') && currentPharmacyId) {
      console.warn('Detectado erro de schema desatualizado no Prisma. Tentando salvamento parcial...');
      try {
        const { logo: _logo, coverImage: _coverImage, ...safePharmacyData } = pharmacyData;
        const [p, u] = await prisma.$transaction([
          prisma.pharmacy.update({
            where: { id: currentPharmacyId },
            data: safePharmacyData as any
          }),
          prisma.user.update({
            where: { id: userId! },
            data: { 
              name: name || undefined, 
              phone: phone || undefined 
            }
          })
        ]);
        return res.json({ ...p, user: u, warning: 'Schema partially desynced. Media fields not saved.' });
      } catch (innerError) {
        console.error('Falha no salvamento parcial:', innerError);
      }
    }

    res.status(500).json({ 
      error: 'Erro ao atualizar perfil', 
      details: error.message,
      prismaCode: error.code 
    });
  }
});

// --- MARKETING E FIDELIZAÇÃO (FASE 4) ---
router.post('/marketing/funnel', ...pharmacyAuth, async (req, res) => {
  res.status(501).json({ message: 'Em implementação' });
});

// --- CRM e Gestão de Clientes ---
router.get('/crm/customers', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { User: { some: { id: userId } } },
      select: { id: true }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // 1. Busca Pedidos Diretos (PharmacyOrder)
    const directOrders = await prisma.pharmacyOrder.findMany({
      where: { pharmacyId: pharmacy.id, status: 'FINISHED' },
      include: { patient: {
          select: {
            id: true,
            User: { select: { name: true, phone: true } },
            Person: { select: { name: true, phone: true } },
            city: true
          }
        },
        PharmacyOrderItem: { include: { PharmacyProduct: { select: { name: true } } } }
      }
    });

    // 2. Busca Cotações Aceitas (QuotationResponse)
    const quoteOrders = await prisma.quotationResponse.findMany({
      where: { pharmacyId: pharmacy.id, status: { in: ['ACCEPTED', 'RECEIVED', 'SEPARATING', 'DELIVERING', 'FINISHED'] } },
      include: {
        QuotationRequest: {
          include: { Patient: {
              select: {
                id: true,
                User: { select: { name: true, phone: true } },
                Person: { select: { name: true, phone: true } },
                city: true
              }
            },
            QuotationRequestItem: { select: { name: true } }
          }
        }
      }
    });

    // Agregação de dados por cliente
    const customerMap = new Map();

    // Processar pedidos diretos
    directOrders.forEach(order => {
      const p = order.patient;
      if (!p) return;
      const patientData = p.Person || p.User;
      const itemName = order.PharmacyOrderItem?.[0]?.PharmacyProduct?.name || 'Medicamento';

      if (!customerMap.has(p.id)) {
        customerMap.set(p.id, {
          patientId: p.id,
          name: patientData?.name || 'Paciente',
          phone: patientData?.phone || '',
          city: p.city || 'N/A',
          totalSpent: 0,
          purchaseCount: 0,
          lastPurchaseDate: order.createdAt,
          lastPurchaseItems: itemName
        });
      }
      
      const data = customerMap.get(p.id);
      data.totalSpent += Number(order.total || 0);
      data.purchaseCount += 1;
      if (new Date(order.createdAt) > new Date(data.lastPurchaseDate)) {
        data.lastPurchaseDate = order.createdAt;
        data.lastPurchaseItems = itemName;
      }
    });

    // Processar cotações aceitas
    quoteOrders.forEach(o => {
      const q = o.QuotationRequest;
      const p = q?.Patient;
      if (!p) return;
      const patientData = p.Person || p.User;
      const itemName = q.QuotationRequestItem?.[0]?.name || 'Medicamento';

      if (!customerMap.has(p.id)) {
        customerMap.set(p.id, {
          patientId: p.id,
          name: patientData?.name || 'Paciente',
          phone: patientData?.phone || '',
          city: p.city || 'N/A',
          totalSpent: 0,
          purchaseCount: 0,
          lastPurchaseDate: o.createdAt,
          lastPurchaseItems: itemName
        });
      }
      
      const data = customerMap.get(p.id);
      data.totalSpent += Number(o.price || 0);
      data.purchaseCount += 1;
      if (new Date(o.createdAt) > new Date(data.lastPurchaseDate)) {
        data.lastPurchaseDate = o.createdAt;
        data.lastPurchaseItems = itemName;
      }
    });

    res.json(Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent));
  } catch (error: any) {
    console.error('[GET /crm/customers] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// NOTA: Rota GET /advanced-report consolidada acima (linha ~1150). Duplicata removida para evitar shadowing.


export default router;

