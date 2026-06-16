// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { financeService } from '../../services/finance.service.js';

const router = Router();

/**
 * @route GET /api/partners/financial-data
 */
router.get('/financial-data', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const data = await prisma.partnerFinancialData.findUnique({
      where: { partnerId: partner.id }
    });

    if (!data) return res.json(null);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar dados financeiros' });
  }
});

/**
 * @route PUT /api/partners/financial-data
 */
router.put('/financial-data', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const payload = {
      ...req.body,
      partnerId: partner.id,
      taxIdType: req.body.taxIdType || (req.body.taxId?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF'),
    };

    const data = await prisma.partnerFinancialData.upsert({
      where: { partnerId: partner.id },
      update: payload,
      create: payload
    });

    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar dados financeiros' });
  }
});

/**
 * @route GET /api/partners/finance/payments
 * Lista os repasses (transações de crédito) do parceiro autenticado.
 */
router.get('/finance/payments', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const { page = 1, pageSize = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const where: any = { partnerId: partner.id };
    if (status && status !== 'all') where.status = String(status).toUpperCase();

    const [total, transactions] = await prisma.$transaction([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
        include: { patient: { include: { User: { select: { name: true, avatar: true } } } }
        }
      })
    ]);

    // Mapear para o formato esperado pelo frontend (useRepasses)
    const payments = transactions.map(tx => {
      let meta: any = {};
      try { meta = tx.metadata ? JSON.parse(String(tx.metadata)) : {}; } catch {}

      return {
        id: tx.id,
        date: tx.createdAt.toISOString().split('T')[0],
        amount: tx.amount,
        status: tx.status === 'COMPLETED' ? 'Pago' : tx.status === 'PENDING' ? 'Pendente' : 'Processando',
        serviceType: tx.category || 'APPOINTMENT',
        description: tx.description,
        patientName: tx.Patient?.User?.name || null,
        patientAvatar: tx.Patient?.User?.avatar || null,
        grossAmount: meta.grossAmount || tx.amount,
        platformFee: meta.platformFee || 0,
        commissionPercent: meta.commissionPercent || 15,
        appointmentId: meta.appointmentId || null,
        type: tx.type,
        createdAt: tx.createdAt
      };
    });

    return res.json({
      data: payments,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize))
    });
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    return res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
});

/**
 * @route GET /api/partners/finance/stats (Aliased from /payments/stats for frontend compatibility)
 * Retorna estatísticas financeiras: saldo disponível, pendente, total recebido.
 */
router.get('/finance/stats', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const stats = await financeService.getDetailedStats(partner.id);

    return res.json({
      balance: stats.balance,
      pendingBalance: stats.pendingBalance,
      pendingWithdrawal: stats.pendingWithdrawal,
      totalRevenue: stats.totalRevenue,
      monthlyAverage: stats.monthlyAverage,
      totalAppointments: stats.totalAppointments,
      yearTotal: stats.yearTotal,
      transactions: stats.transactions
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas financeiras:', error);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas financeiras' });
  }
});

/**
 * @route POST /api/partners/finance/payout
 * Solicita um saque do saldo disponível.
 */
router.post('/finance/payout', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { amount, bankDetails } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor de saque inválido' });
    }

    const partner = await prisma.partner.findFirst({ 
      where: { userId }, 
      select: { id: true } 
    });
    
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    // Verificar saldo disponível via serviço
    const wallet = await financeService.getWalletStats(partner.id);
    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Saldo disponível insuficiente para este saque' });
    }

    // Criar solicitação de saque
    const payout = await financeService.requestPayout(partner.id, amount);
    
    // Opcional: Atualizar metadados com os dados bancários usados no momento do saque
    await prisma.transaction.update({
      where: { id: payout.id },
      data: {
        metadata: JSON.stringify({ bankDetails })
      }
    });

    return res.status(201).json(payout);
  } catch (error: any) {
    console.error('Erro ao processar saque:', error);
    return res.status(500).json({ error: 'Erro interno ao processar saque', details: error.message });
  }
});

/**
 * @route GET /api/partners/payments/stats
 * Keep legacy route if needed by other components
 */
router.get('/payments/stats', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const stats = await financeService.getWalletStats(partner.id);
    return res.json({
      data: {
        balance: stats.balance,
        pendingBalance: stats.pendingBalance,
        totalRevenue: stats.totalRevenue,
        recentTransactions: stats.transactions.slice(0, 5)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

/**
 * @route POST /api/partners/finance/anticipation
 * Solicita antecipação de recebíveis pendentes.
 */
router.post('/finance/anticipation', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const stats = await financeService.getWalletStats(partner.id);

    if (stats.pendingBalance <= 0) {
      return res.status(400).json({ error: 'Não há valores pendentes para antecipar' });
    }

    // Registrar a solicitação de antecipação como uma transação
    const anticipation = await prisma.transaction.create({
      data: {
        partnerId: partner.id,
        amount: stats.pendingBalance,
        type: 'DEBIT',
        description: 'Solicitação de Antecipação de Recebíveis',
        status: 'PENDING',
        category: 'ANTICIPATION'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Solicitação de antecipação enviada com sucesso',
      anticipation
    });
  } catch (error) {
    console.error('Erro ao solicitar antecipação:', error);
    return res.status(500).json({ error: 'Erro ao solicitar antecipação' });
  }
});

/**
 * @route GET /api/partners/finance/payments/:id/receipt
 * Baixar comprovante de um repasse específico.
 */
router.get('/finance/payments/:id/receipt', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const transaction = await prisma.transaction.findFirst({
      where: { id, partnerId: partner.id },
      include: { patient: { include: { User: { select: { name: true } } } } }
    });

    if (!transaction) return res.status(404).json({ error: 'Transação não encontrada' });

    // Retornar dados do comprovante (em produção, geraria PDF)
    return res.json({
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      status: transaction.status,
      createdAt: transaction.createdAt,
      patientName: transaction.Patient?.User?.name || 'N/A'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar comprovante' });
  }
});

export default router;
