import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import inAppNotificationService from '../services/inAppNotification.service.js';
import { SocketService } from '../lib/socket.js';
import multer from 'multer';
import { storageService } from '../services/storage.service.js';

const router = Router();
console.log('💊 [PharmacyRoutes] Módulo carregado e inicializado');

// Endpoint de Diagnóstico
router.get('/ping', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'pharmacy-module',
    timestamp: new Date().toISOString(),
    build: 'v-final-marketing-fix'
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
      where: { users: { some: { id: userId } } }
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

    return res.json({
      activePromotions,
      totalPromotions,
      totalViews: views,
      totalClicks: clicks,
      conversionRate,
      period: 'Últimos 30 dias'
    });
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
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });

    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // 1. Pedidos Recebidos Hoje (Solicitações de Cotação)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requestsToday = await prisma.quotationRequest.count({
      where: { createdAt: { gte: today } }
    });

    // 2. Minhas Respostas Hoje
    const myResponsesToday = await prisma.quotationResponse.count({
      where: {
        pharmacyId: pharmacy.id,
        createdAt: { gte: today }
      }
    });

    // 3. Taxa de Resposta
    const responseRate = requestsToday > 0 ? (myResponsesToday / requestsToday) * 100 : 0;

    // 4. Tempo Médio de Resposta (em segundos)
    const avgResponse = await prisma.quotationResponse.aggregate({
      where: { pharmacyId: pharmacy.id },
      _avg: { responseTimeSec: true }
    });

    // 5. Vendas Ganhas (Conversões)
    const winCount = await prisma.quotationResponse.count({
      where: {
        pharmacyId: pharmacy.id,
        status: 'ACCEPTED'
      }
    });

    // 6. Faturamento Estimado
    const revenue = await prisma.quotationResponse.aggregate({
      where: {
        pharmacyId: pharmacy.id,
        status: 'ACCEPTED'
      },
      _sum: { price: true }
    });

    // 7. Insights de IA (Simulados por enquanto com base nos novos modelos)
    const lostSales = await prisma.pharmacyMetric.count({
      where: {
        pharmacyId: pharmacy.id,
        type: 'SALE_LOST_STOCK'
      }
    });

    const insights = [
      {
        id: '1',
        type: 'warning',
        message: lostSales > 0 
          ? `Você perdeu ${lostSales} vendas hoje por falta de estoque informado.`
          : 'Seu estoque está bem sinalizado para as demandas de hoje.',
        action: 'Atualizar Estoque'
      },
      {
        id: '2',
        type: 'info',
        message: 'Alta demanda por antitérmicos na sua região detectada nas últimas 2 horas.',
        action: 'Ver Detalhes'
      }
    ];

    res.json({
      kpis: {
        requestsToday,
        myResponsesToday,
        responseRate: Math.round(responseRate),
        avgResponseTime: Math.round(avgResponse._avg.responseTimeSec || 0),
        winCount,
        estimatedRevenue: revenue._sum.price || 0
      },
      insights,
      ranking: {
        score: 85, // Mock por enquanto
        position: 3,
        total: 12
      }
    });

  } catch (error) {
    console.error('Erro no dashboard da farmácia:', error);
    res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
  }
});

// --- Listagem de Cotações Ativas ---
router.get('/quotations', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });

    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // Busca solicitações que ainda não foram respondidas por ESTA farmácia
    const requests = await prisma.quotationRequest.findMany({
      where: {
        status: 'OPEN',
        responses: {
          none: { pharmacyId: pharmacy.id }
        }
      },
      include: {
        patient: {
          select: {
            user: { select: { name: true, avatar: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json(requests);
  } catch (error) {
    console.error('Erro ao listar cotações:', error);
    res.status(500).json({ error: 'Erro ao listar solicitações de cotação' });
  }
});

// --- Responder Cotação ---
router.post('/quotations/:id/respond', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, isAvailable, deliveryTimeMin, observations } = req.body;
    const userId = req.user?.userId;

    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });

    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const request = await prisma.quotationRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    // Calcula tempo de resposta
    const responseTimeSec = Math.floor((new Date().getTime() - request.createdAt.getTime()) / 1000);

    const response = await prisma.quotationResponse.create({
      data: {
        quotationId: id,
        pharmacyId: pharmacy.id,
        price: Number(price),
        isAvailable: Boolean(isAvailable),
        deliveryTimeMin: Number(deliveryTimeMin),
        observations,
        responseTimeSec,
        status: 'PENDING'
      }
    });

    // Notificar paciente
    const patient = await prisma.patient.findUnique({ where: { id: request.patientId } });
    if (patient) {
      await inAppNotificationService.createNotification({
        userId: patient.userId,
        type: 'SYSTEM',
        title: 'Nova Cotação!',
        message: `A farmácia ${pharmacy.name} respondeu sua solicitação de ${request.medicamentName}.`,
        priority: 'high',
        link: '/patient/quotations'
      });

      // Sincronização em Tempo Real via Socket.io
      SocketService.sendToUser(patient.userId, 'pharmacyQuoteUpdate', { responseId: response.id });
    }

    res.json({ success: true, response });
  } catch (error) {
    console.error('Erro ao responder cotação:', error);
    res.status(500).json({ error: 'Erro ao enviar resposta' });
  }
});

// --- Promoções / Vitrines (Fase 3) ---
router.get('/promotions', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
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
      where: { users: { some: { id: userId } } }
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
      where: { users: { some: { id: userId } } }
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
    const publicUrl = await storageService.uploadFile(buffer, originalname, mimetype, 'marketing');

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
      where: { users: { some: { id: userId } } }
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
      where: { users: { some: { id: userId } } }
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

// Bug #2 corrigido: Rota /marketing/stats foi movida para o topo do arquivo.
// Funil de Marketing (dados visuais separados)
router.get('/marketing/funnel', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const activePromotions = await prisma.pharmacyPromotion.count({
      where: { pharmacyId: pharmacy.id, isActive: true }
    });

    // Funil baseado em promoções ativas (em produção viria de métricas reais)
    const funnel = [
      { name: 'Alcance Local', valor: activePromotions * 150, color: '#94a3b8' },
      { name: 'Interessados', valor: activePromotions * 45, color: '#3b82f6' },
      { name: 'Conversão (Vendas)', valor: activePromotions * 12, color: '#10b981' },
    ];

    res.json(funnel);
  } catch (error) {
    console.error('Erro ao buscar funil de marketing:', error);
    res.status(500).json({ error: 'Erro ao processar funil' });
  }
});

// Endpoint para puxar pedidos prontos para entrega
router.get('/orders/delivery', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const deliveries = await prisma.quotationResponse.findMany({
      where: { 
        pharmacyId: pharmacy.id,
        status: 'ACCEPTED'
      },
      include: {
        quotation: {
          include: {
            patient: {
              select: {
                user: { select: { name: true, phone: true } },
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
      where: { users: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const products = await prisma.pharmacyProduct.findMany({
      where: { pharmacyId: pharmacy.id },
      orderBy: { name: 'asc' }
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
      where: { users: { some: { id: userId } } }
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
      where: { users: { some: { id: userId } } }
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
      where: { users: { some: { id: userId } } }
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

// --- GESTÃO DE PEDIDOS (STAKEHOLDER iFOOD STYLE) ---
router.get('/orders', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const orders = await prisma.pharmacyOrder.findMany({
      where: { pharmacyId: pharmacy.id },
      include: {
        patient: { select: { user: { select: { name: true, phone: true } }, address: true } },
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
});

// Bug #5 corrigido: Adicionada verificação de propriedade do pedido
router.put('/orders/:id/status', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // RECEIVED, SEPARATING, DELIVERING, FINISHED, CANCELLED
    const userId = req.user?.userId;

    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // Verifica se o pedido pertence a esta farmácia
    const existingOrder = await prisma.pharmacyOrder.findFirst({
      where: { id, pharmacyId: pharmacy.id }
    });
    if (!existingOrder) return res.status(403).json({ error: 'Pedido não encontrado ou sem permissão' });

    const order = await prisma.pharmacyOrder.update({
      where: { id },
      data: { status },
      include: { patient: true }
    });

    // Notificar o paciente sobre a mudança de status
    await inAppNotificationService.createNotification({
      userId: order.patient.userId,
      type: 'SYSTEM',
      title: 'Status do Pedido Atualizado',
      message: `Seu pedido na farmácia está agora: ${status}`,
      link: '/patient/orders'
    });

    // Sincronização em Tempo Real via Socket.io
    SocketService.sendToUser(order.patient.userId, 'pharmacyOrderUpdate', { orderId: order.id, status });

    res.json(order);
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
  }
});

// --- FINANCEIRO ---
router.get('/financial/report', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const finishedOrders = await prisma.pharmacyOrder.findMany({
      where: { 
        pharmacyId: pharmacy.id,
        status: 'FINISHED'
      }
    });

    const totalRevenue = finishedOrders.reduce((acc, current) => acc + current.total, 0);
    const totalCommission = finishedOrders.reduce((acc, current) => acc + current.commissionAmount, 0);
    const netPayout = totalRevenue - totalCommission;

    res.json({
      totalRevenue,
      totalCommission,
      netPayout,
      orderCount: finishedOrders.length
    });
  } catch (error) {
    console.error('Erro no relatório financeiro:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório financeiro' });
  }
});

router.get('/financial/stats', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const orders = await prisma.pharmacyOrder.findMany({
      where: {
        pharmacyId: pharmacy.id,
        status: 'FINISHED',
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
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

    orders.forEach(o => {
      const dateStr = o.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].bruto += o.total;
        dailyMap[dateStr].liquido += (o.total - o.commissionAmount);
      }
    });

    res.json(Object.values(dailyMap));
  } catch (error) {
    console.error('Erro ao buscar stats financeiras:', error);
    res.status(500).json({ error: 'Erro ao processar estatísticas financeiras' });
  }
});

// --- INSIGHTS DE IA ---
router.get('/insights', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });

    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // 1. Verificar produtos com estoque baixo
    const lowStockCount = await prisma.pharmacyProduct.count({
      where: {
        pharmacyId: pharmacy.id,
        stock: { lte: 5 }
      }
    });

    const insights = [];

    if (lowStockCount > 0) {
      insights.push({
        title: 'Reposição Necessária',
        message: `Você possui ${lowStockCount} produtos com estoque baixo ou crítico.`,
        type: 'WARNING',
        action: 'Ver Estoque'
      });
    }

    // 2. Simular radar de demanda regional (baseado em cotações globais)
    const today = new Date();
    today.setHours(today.getHours() - 3);

    const recentRequests = await prisma.quotationRequest.count({
      where: {
        createdAt: { gte: today }
      }
    });

    if (recentRequests > 0) {
      insights.push({
        title: 'Vendas no Radar',
        message: `Existem ${recentRequests} novas solicitações na sua região aguardando resposta.`,
        type: 'INFO',
        action: 'Ver Radar'
      });
    } else {
      insights.push({
        title: 'IA Docton Insight',
        message: 'Sua taxa de conversão aumenta em 45% quando você responde em menos de 8 minutos.',
        type: 'INFO',
        action: 'Saber Mais'
      });
    }

    res.json(insights);
  } catch (error) {
    console.error('Erro ao buscar insights:', error);
    res.status(500).json({ error: 'Erro ao processar insights' });
  }
});

// --- DADOS PARA O GRÁFICO DO DASHBOARD ---
router.get('/dashboard/chart', ...pharmacyAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar solicitações de cotação por hora no dia de hoje
    const requests = await prisma.quotationRequest.findMany({
      where: { createdAt: { gte: today } },
      select: { createdAt: true }
    });

    // Agrupar por hora
    const hourlyData: Record<string, number> = {};
    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    
    hours.forEach(h => hourlyData[h] = 0);

    requests.forEach(req => {
      const hour = req.createdAt.getHours();
      let label = '08:00';
      if (hour >= 22) label = '22:00';
      else if (hour >= 20) label = '20:00';
      else if (hour >= 18) label = '18:00';
      else if (hour >= 16) label = '16:00';
      else if (hour >= 14) label = '14:00';
      else if (hour >= 12) label = '12:00';
      else if (hour >= 10) label = '10:00';
      else label = '08:00';
      
      hourlyData[label]++;
    });

    // Bug #6 corrigido: Removido Math.random() — gráfico agora mostra dados reais (ou 0)
    const chartData = hours.map(name => ({
      name,
      pedidos: hourlyData[name] || 0,
      conversao: hourlyData[name] > 0 ? Math.round((hourlyData[name] / Math.max(1, requests.length)) * 100) : 0
    }));

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
      where: { users: { some: { id: userId } } }
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

// --- CRM E GESTÃO DE CLIENTES ---
router.get('/crm/customers', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // Busca clientes únicos que já compraram nesta farmácia
    const customers = await prisma.pharmacyCustomer.findMany({
      where: { pharmacyId: pharmacy.id },
      include: {
        patient: {
          select: {
            id: true,
            city: true,
            person: {
              select: {
                name: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { totalSpent: 'desc' }
    });

    // Para cada cliente, vamos buscar o último pedido finalizado para saber o que ele comprou
    const customersWithLastPurchase = await Promise.all(customers.map(async (c) => {
      const lastOrder = await prisma.pharmacyOrder.findFirst({
        where: {
          pharmacyId: pharmacy.id,
          patientId: c.patientId,
          status: 'FINISHED'
        },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: true }
          }
        }
      });

      const itemsList = lastOrder?.items.map(i => i.product.name).join(', ') || 'Produtos Variados';

      return {
        patientId: c.patientId,
        name: c.patient.person?.name || 'Paciente sem nome',
        phone: c.patient.person?.phone || 'Sem telefone',
        city: c.patient.city || 'Não informado',
        totalSpent: c.totalSpent,
        purchaseCount: c.orderCount,
        lastPurchaseDate: c.lastOrder || c.createdAt,
        lastPurchaseItems: itemsList,
        isVIP: c.isVIP
      };
    }));

    res.json(customersWithLastPurchase);
  } catch (error) {
    console.error('Erro ao buscar CRM:', error);
    res.status(500).json({ error: 'Erro ao processar carteira de clientes' });
  }
});

// --- PERFIL DA FARMÁCIA (CONFIGURAÇÕES) ---
router.get('/profile', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });
    res.json(pharmacy);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Bug #7 corrigido: Whitelist de campos permitidos para evitar sobrescrita de campos sensíveis
router.put('/profile', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // Whitelist: apenas campos que o usuário pode editar no perfil
    const allowedFields = [
      'name', 'phone', 'whatsapp', 'address', 'neighborhood', 'city', 'state', 'zipCode',
      'description', 'openingHours', 'logo', 'coverImage', 'instagram', 'facebook', 'website'
    ];
    const safeData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        safeData[field] = req.body[field];
      }
    }

    const updatedPharmacy = await prisma.pharmacy.update({
      where: { id: pharmacy.id },
      data: safeData
    });

    res.json(updatedPharmacy);
  } catch (error) {
    console.error('Erro ao atualizar perfil da farmácia:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

export default router;
