// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/financial/summary
 */
router.get('/financial/summary', ...adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let where = {};
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const totalRevenue = await prisma.transaction.aggregate({
      where: { ...where, type: 'INCOME' },
      _sum: { amount: true }
    });
    
    const totalExpenses = await prisma.transaction.aggregate({
      where: { ...where, type: 'EXPENSE' },
      _sum: { amount: true }
    });
    
    const revenueAmount = totalRevenue._sum.amount || 0;
    const expenseAmount = totalExpenses._sum.amount || 0;
    const netProfit = revenueAmount - expenseAmount;
    const profitMargin = revenueAmount > 0 ? (netProfit / revenueAmount) * 100 : 0;

    res.json({
      totalRevenue: revenueAmount,
      totalExpenses: expenseAmount,
      netProfit: netProfit,
      profitMargin: profitMargin,
      revenueGrowth: 0,
      expenseGrowth: 0,
      profitGrowth: 0,
      marginGrowth: 0
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Erro ao obter resumo financeiro' });
  }
});

/**
 * @route GET /api/admin/financial/transactions
 */
router.get('/financial/transactions', ...adminAuth, async (req, res) => {
  try {
    const { q, type, status, sortBy, sortDir, page, pageSize, startDate, endDate } = req.query;
    
    let where = {};
    
    if (q) {
      where.OR = [
        { description: { contains: String(q), mode: 'insensitive' } },
        { client: { contains: String(q), mode: 'insensitive' } }
      ];
    }
    
    if (type && type !== 'Todos') {
      where.type = type === 'Entrada' ? 'INCOME' : 'EXPENSE';
    }
    
    if (status && status !== 'Todos') {
      where.status = status === 'Concluído' ? 'COMPLETED' : 'PENDING';
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const orderBy = sortBy === 'value' 
      ? { amount: sortDir === 'asc' ? 'asc' : 'desc' }
      : { date: sortDir === 'asc' ? 'asc' : 'desc' };

    const take = parseInt(pageSize) || 10;
    const skip = ((parseInt(page) || 1) - 1) * take;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        skip,
        take
      }),
      prisma.transaction.count({ where })
    ]);

    // Format transactions for frontend
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      description: tx.description,
      client: tx.client || '',
      date: tx.date.toLocaleDateString('pt-BR'),
      value: tx.amount,
      type: tx.type === 'INCOME' ? 'Entrada' : 'Saída',
      status: tx.status === 'COMPLETED' ? 'Concluído' : 'Pendente',
      dreCategory: tx.dreCategory,
      dueDate: tx.dueDate,
      paymentDate: tx.paymentDate,
      partnerId: tx.partnerId
    }));

    res.json({ items: formattedTransactions, total, page: parseInt(page) || 1, pageSize: take });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Erro ao obter transações' });
  }
});

/**
 * @route GET /api/admin/financial/revenue
 */
router.get('/financial/revenue', ...adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let where = {};
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Get monthly data for the last 12 months
    const transactions = await prisma.transaction.findMany({
      where: { ...where, type: { in: ['INCOME', 'EXPENSE'] } },
      orderBy: { date: 'asc' }
    });

    // Aggregate by month
    const dataMap = {};
    transactions.forEach(tx => {
      const month = tx.date.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
      if (!dataMap[month]) {
        dataMap[month] = { month, receita: 0, despesa: 0 };
      }
      if (tx.type === 'INCOME') {
        dataMap[month].receita += tx.amount;
      } else {
        dataMap[month].despesa += tx.amount;
      }
    });

    const revenueSeries = Object.values(dataMap);
    res.json(revenueSeries);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ error: 'Erro ao obter dados de receita' });
  }
});

/**
 * @route POST /api/admin/financial/transactions
 */
router.post('/financial/transactions', ...adminAuth, async (req, res) => {
  try {
    const { description, client, date, value, type, status, dreCategory, dueDate, paymentDate, partnerId } = req.body;
    
    const transaction = await prisma.transaction.create({
      data: {
        description,
        client,
        date: new Date(date),
        amount: type === 'Saída' ? -Math.abs(value) : Math.abs(value),
        type: type === 'Entrada' ? 'INCOME' : 'EXPENSE',
        status: status === 'Concluído' ? 'COMPLETED' : 'PENDING',
        dreCategory,
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        partnerId
      }
    });

    res.json({
      ...transaction,
      type: transaction.type === 'INCOME' ? 'Entrada' : 'Saída',
      status: transaction.status === 'COMPLETED' ? 'Concluído' : 'Pendente',
      date: transaction.date.toLocaleDateString('pt-BR')
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
});

/**
 * @route PUT /api/admin/financial/transactions/:id
 */
router.put('/financial/transactions/:id', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, client, date, value, type, status, dreCategory, dueDate, paymentDate, partnerId } = req.body;
    
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        description,
        client,
        date: date ? new Date(date) : undefined,
        amount: type !== undefined ? (type === 'Saída' ? -Math.abs(value) : Math.abs(value)) : undefined,
        type: type !== undefined ? (type === 'Entrada' ? 'INCOME' : 'EXPENSE') : undefined,
        status: status !== undefined ? (status === 'Concluído' ? 'COMPLETED' : 'PENDING') : undefined,
        dreCategory,
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        partnerId
      }
    });

    res.json({
      ...transaction,
      type: transaction.type === 'INCOME' ? 'Entrada' : 'Saída',
      status: transaction.status === 'COMPLETED' ? 'Concluído' : 'Pendente',
      date: transaction.date.toLocaleDateString('pt-BR')
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

/**
 * @route DELETE /api/admin/financial/transactions/:id
 */
router.delete('/financial/transactions/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Transação excluída' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Erro ao excluir transação' });
  }
});

/**
 * @route GET /api/admin/finance/overview
 */
router.get('/finance/overview', ...adminAuth, async (req, res) => {
  try {
    const [pharmacyCommissions, platformTransactions] = await Promise.all([
      prisma.pharmacyOrder.aggregate({ where: { status: 'FINISHED' }, _sum: { commissionAmount: true } }),
      prisma.transaction.aggregate({ where: { type: 'INCOME', status: 'COMPLETED' }, _sum: { amount: true } })
    ]);

    const totalRevenue = (pharmacyCommissions._sum.commissionAmount || 0) + (platformTransactions._sum.amount || 0);
    const activeRequestsCount = await prisma.appointment.count({ where: { status: { in: ['PENDING', 'SCHEDULED', 'CONFIRMED'] } } });

    res.json({
      platformRevenue: totalRevenue,
      activeRequestsCount: activeRequestsCount,
      activeRequestsSum: totalRevenue * 0.15
    });
  } catch (error) {
    console.error('Error in finance overview:', error);
    res.status(500).json({ error: 'Erro no overview financeiro' });
  }
});

// --- Transfers (Repasses) ---
router.get('/transfers', ...adminAuth, async (req, res) => {
  try {
    const transfers = await prisma.transfer.findMany({ include: { Partner: true } });
    res.json({ items: transfers, total: transfers.length, page: 1, pageSize: 10 });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ error: 'Erro ao obter repasses' });
  }
});

router.post('/transfers', ...adminAuth, async (req, res) => {
  try {
    const transfer = await prisma.transfer.create({ data: req.body });
    res.status(201).json(transfer);
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({ error: 'Erro ao criar repasse' });
  }
});

/**
 * @route GET /api/admin/financial/dre
 */
router.get('/financial/dre', ...adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let where = {};
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const totalRevenue = await prisma.transaction.aggregate({
      where: { ...where, type: 'INCOME' },
      _sum: { amount: true }
    });
    
    const totalExpenses = await prisma.transaction.aggregate({
      where: { ...where, type: 'EXPENSE' },
      _sum: { amount: true }
    });
    
    const revenueAmount = totalRevenue._sum.amount || 0;
    const expenseAmount = totalExpenses._sum.amount || 0;

    // Mock DRE data based on transactions
    const dreData = {
      grossRevenue: revenueAmount,
      deductions: 0,
      netRevenue: revenueAmount,
      costs: expenseAmount * 0.6, // 60% dos custos operacionais
      grossProfit: revenueAmount - (expenseAmount * 0.6),
      expenses: expenseAmount * 0.4, // 40% das despesas operacionais
      operatingProfit: revenueAmount - expenseAmount,
      taxes: (revenueAmount - expenseAmount) * 0.15, // 15% de impostos
      netProfit: (revenueAmount - expenseAmount) * 0.85
    };

    res.json(dreData);
  } catch (error) {
    console.error('Error fetching DRE:', error);
    res.status(500).json({ error: 'Erro ao obter DRE' });
  }
});

/**
 * @route GET /api/admin/financial/accounts/summary
 */
router.get('/financial/accounts/summary', ...adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let where = {};
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Get pending transactions for accounts receivable/payable
    const pendingTransactions = await prisma.transaction.findMany({
      where: { ...where, status: 'PENDING' },
      include: { Partner: true }
    });

    const receivable = pendingTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const payable = Math.abs(pendingTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0));

    // Calculate series data for the last 30 days
    const seriesData = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const dayTransactions = await prisma.transaction.findMany({
        where: {
          date: { gte: dayStart, lt: dayEnd },
          status: 'PENDING'
        }
      });
      
      const dayReceivable = dayTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
      const dayPayable = Math.abs(dayTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0));
      
      seriesData.unshift({
        date: dayStart.toISOString().split('T')[0],
        receivable: dayReceivable,
        payable: dayPayable
      });
    }

    // Calculate by partner data
    const byPartner = pendingTransactions.reduce((acc, tx) => {
      const partnerName = tx.Partner?.name || tx.client || 'Outros';
      const existing = acc.find(p => p.name === partnerName);
      
      if (existing) {
        if (tx.type === 'INCOME') {
          existing.receivable += tx.amount;
        } else {
          existing.payable += Math.abs(tx.amount);
        }
      } else {
        acc.push({
          name: partnerName,
          receivable: tx.type === 'INCOME' ? tx.amount : 0,
          payable: tx.type === 'EXPENSE' ? Math.abs(tx.amount) : 0
        });
      }
      
      return acc;
    }, []);

    res.json({
      payable,
      receivable,
      byPartner,
      series: seriesData
    });
  } catch (error) {
    console.error('Error fetching accounts summary:', error);
    res.status(500).json({ error: 'Erro ao obter resumo de contas' });
  }
});

/**
 * @route GET /api/admin/financial/dre/report
 */
router.get('/financial/dre/report', ...adminAuth, async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    const monthlyData = [];
    
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(selectedYear, i, 1);
      const monthEnd = new Date(selectedYear, i + 1, 0);
      
      const monthlyRevenue = await prisma.transaction.aggregate({
        where: {
          date: { gte: monthStart, lte: monthEnd },
          type: 'INCOME'
        },
        _sum: { amount: true }
      });

      const monthlyExpenses = await prisma.transaction.aggregate({
        where: {
          date: { gte: monthStart, lte: monthEnd },
          type: 'EXPENSE'
        },
        _sum: { amount: true }
      });

      const revenue = monthlyRevenue._sum.amount || 0;
      const expenses = monthlyExpenses._sum.amount || 0;

      monthlyData.push({
        month: i + 1,
        grossRevenue: revenue,
        deductions: 0,
        netRevenue: revenue,
        costs: expenses * 0.6,
        grossProfit: revenue - (expenses * 0.6),
        expenses: expenses * 0.4,
        operatingProfit: revenue - expenses,
        taxes: (revenue - expenses) * 0.15,
        netProfit: (revenue - expenses) * 0.85,
        growth: 0
      });
    }

    // Calculate annual data
    const annualData = monthlyData.reduce((acc, month) => ({
      grossRevenue: acc.grossRevenue + month.grossRevenue,
      deductions: acc.deductions + month.deductions,
      netRevenue: acc.netRevenue + month.netRevenue,
      costs: acc.costs + month.costs,
      grossProfit: acc.grossProfit + month.grossProfit,
      expenses: acc.expenses + month.expenses,
      operatingProfit: acc.operatingProfit + month.operatingProfit,
      taxes: acc.taxes + month.taxes,
      netProfit: acc.netProfit + month.netProfit
    }), {
      grossRevenue: 0,
      deductions: 0,
      netRevenue: 0,
      costs: 0,
      grossProfit: 0,
      expenses: 0,
      operatingProfit: 0,
      taxes: 0,
      netProfit: 0
    });

    res.json({
      year: selectedYear,
      monthly: monthlyData,
      annual: annualData
    });
  } catch (error) {
    console.error('Error fetching DRE report:', error);
    res.status(500).json({ error: 'Erro ao obter relatório DRE' });
  }
});

// --- Payouts (Solicitações de Saque) ---
router.get('/finance/payouts', ...adminAuth, async (req, res) => {
  try {
    const transfers = await prisma.transfer.findMany({
      include: {
        Partner: {
          include: {
            User: true
          }
        }
      }
    });

    const formatted = transfers.map(t => ({
      id: t.id,
      partnerId: t.partnerId,
      amount: t.amount,
      status: t.status,
      processedAt: t.processedAt?.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      partner: t.Partner ? {
        name: t.Partner.name || '',
        specialty: t.Partner.specialty || '',
        user: {
          email: t.Partner.User?.email || '',
          phone: t.Partner.User?.phone || ''
        }
      } : null
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

router.post('/finance/payouts/:id/approve', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date()
      }
    });

    res.json({ success: true, transfer: updated });
  } catch (error) {
    console.error('Error approving payout:', error);
    res.status(500).json({ error: 'Failed to approve payout' });
  }
});

router.post('/finance/payouts/:id/reject', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const updated = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'REJECTED'
      }
    });

    res.json({ success: true, transfer: updated });
  } catch (error) {
    console.error('Error rejecting payout:', error);
    res.status(500).json({ error: 'Failed to reject payout' });
  }
});

// --- Prices ---
router.get('/prices', ...adminAuth, async (req, res) => {
  try {
    const prices = await prisma.servicePrice?.findMany() || [];
    res.json(prices);
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.json([]);
  }
});

export default router;
