import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import inAppNotificationService from '../services/inAppNotification.service.js';
import { SocketService } from '../lib/socket.js';

const router = Router();
const pharmacyAuth = [authenticate, authorize('PHARMACY')];

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

// Endpoint MÓDULO FASE 4: CRM / Retenção de Clientes (Histórico de LTV)
router.get('/crm/customers', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    // Pega todas as respostas aceitas para formar a carteira de clientes
    const closedDeals = await prisma.quotationResponse.findMany({
      where: { 
        pharmacyId: pharmacy.id,
        status: 'ACCEPTED'
      },
      include: {
        quotation: {
          include: {
            patient: {
              select: {
                id: true,
                user: { select: { name: true, phone: true } },
                city: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Agrega clientes únicos
    const customerMap = new Map();
    for (const deal of closedDeals) {
      const pId = deal.quotation.patientId;
      if (!customerMap.has(pId)) {
        customerMap.set(pId, {
          patientId: pId,
          name: deal.quotation.patient.user.name,
          phone: deal.quotation.patient.user.phone,
          city: deal.quotation.patient.city,
          totalSpent: 0,
          purchaseCount: 0,
          lastPurchaseDate: deal.createdAt,
          lastPurchaseItems: deal.quotation.medicamentName
        });
      }
      
      const customer = customerMap.get(pId);
      customer.purchaseCount += 1;
      customer.totalSpent += Number(deal.price || 0);
    }

    const customers = Array.from(customerMap.values());
    res.json(customers);
  } catch (error) {
    console.error('Erro ao listar carteira CRM:', error);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

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

router.put('/products/:id', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, stock, stockMin, isActive, promotionPrice, brand, lab, barcode, sku, description, validity, batch } = req.body;

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

router.delete('/products/:id', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
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

router.put('/orders/:id/status', ...pharmacyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // RECEIVED, SEPARATING, DELIVERING, FINISHED, CANCELLED

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

router.put('/profile', ...pharmacyAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { users: { some: { id: userId } } }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });

    const updatedPharmacy = await prisma.pharmacy.update({
      where: { id: pharmacy.id },
      data: req.body
    });

    res.json(updatedPharmacy);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

export default router;
