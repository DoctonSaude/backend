// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/dashboard
 */
router.get('/dashboard', ...adminAuth, async (req, res) => {
  try {
    console.log('🟢 Iniciando busca de dados do dashboard...');
    
    const { period, startDate, endDate } = req.query;

    // Determine Date Range
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
      if (dateFilter.lte) dateFilter.lte.setHours(23, 59, 59, 999);
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      dateFilter = { gte: d };
    }

    // Status Agrupados
    const userStats = await prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true }
    });
    
    console.log('📊 userStats:', userStats);

    const getCountByRole = (role: string) => userStats.find(s => s.role === role)?._count._all || 0;

    const [totalAppointments, completedAppointments, totalPharmacies, totalAdmins] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: 'COMPLETED' } }),
      prisma.pharmacy.count(),
      getCountByRole('ADMIN')
    ]);
    
    console.log('📊 Métricas:', {
      totalUsers: userStats.reduce((acc, curr) => acc + curr._count._all, 0),
      totalPatients: getCountByRole('PATIENT'),
      totalPartners: getCountByRole('PARTNER'),
      totalAdmins,
      totalAppointments,
      completedAppointments,
      totalPharmacies
    });

    // Crescimento (Growth)
    const endRange = dateFilter.lte || new Date();
    const startRange = dateFilter.gte || new Date(new Date().setDate(new Date().getDate() - 30));
    const duration = endRange.getTime() - startRange.getTime();

    const prevStart = new Date(startRange.getTime() - duration);
    const prevEnd = new Date(startRange.getTime() - 1);

    const [
      currUsers, prevUsers,
      currPatients, prevPatients,
      currPartners, prevPartners,
      currAppts, prevAppts,
      currPharmacies, prevPharmacies
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: startRange, lte: endRange } } }),
      prisma.user.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
      prisma.user.count({ where: { role: 'PATIENT', createdAt: { gte: startRange, lte: endRange } } }),
      prisma.user.count({ where: { role: 'PATIENT', createdAt: { gte: prevStart, lte: prevEnd } } }),
      prisma.user.count({ where: { role: 'PARTNER', createdAt: { gte: startRange, lte: endRange } } }),
      prisma.user.count({ where: { role: 'PARTNER', createdAt: { gte: prevStart, lte: prevEnd } } }),
      prisma.appointment.count({ where: { createdAt: { gte: startRange, lte: endRange } } }),
      prisma.appointment.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
      prisma.pharmacy.count({ where: { createdAt: { gte: startRange, lte: endRange } } }),
      prisma.pharmacy.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
    ]);

    const calcGrowth = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    // --- Dados para Gráficos ---

    // 1. Crescimento de Usuários por Período
    const userGrowthMap = new Map();
    let currentDate = new Date(startRange);
    while (currentDate <= endRange) {
      const dateKey = currentDate.toISOString().split('T')[0];
      userGrowthMap.set(dateKey, { usuarios: 0, pacientes: 0, parceiros: 0, farmacias: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Contar usuários por data
    const newUsers = await prisma.user.findMany({ where: { createdAt: { gte: startRange, lte: endRange } }, select: { createdAt: true, role: true } });
    newUsers.forEach(u => {
      const dateKey = u.createdAt.toISOString().split('T')[0];
      const entry = userGrowthMap.get(dateKey);
      if (entry) {
        entry.usuarios++;
        if (u.role === 'PATIENT') entry.pacientes++;
        if (u.role === 'PARTNER') entry.parceiros++;
      }
    });

    const newPharmacies = await prisma.pharmacy.findMany({ where: { createdAt: { gte: startRange, lte: endRange } }, select: { createdAt: true } });
    newPharmacies.forEach(p => {
      const dateKey = p.createdAt.toISOString().split('T')[0];
      const entry = userGrowthMap.get(dateKey);
      if (entry) entry.farmacias++;
    });

    const userGrowthData = Array.from(userGrowthMap.entries()).map(([period, data]) => ({
      period,
      ...data
    }));

    // 2. Consultas (simples sem specialty pois campo não existe no schema)
    const appointmentsBySpecialty = [];

    // 3. Receita e Despesas
    const transactions = await prisma.transaction.findMany({
      where: { status: 'COMPLETED', date: { gte: startRange, lte: endRange } },
      select: { date: true, amount: true, type: true }
    });

    const revenueMap = new Map();
    let current = new Date(startRange);
    while (current <= endRange) {
      const key = current.toISOString().split('T')[0];
      revenueMap.set(key, { period: key, receita: 0, despesas: 0 });
      current.setDate(current.getDate() + 1);
    }

    transactions.forEach(t => {
      const key = new Date(t.date).toISOString().split('T')[0];
      const entry = revenueMap.get(key);
      if (entry) {
        if (t.type === 'REVENUE' || t.type === 'INCOME') {
          entry.receita += Number(t.amount || 0);
        } else {
          entry.despesas += Number(t.amount || 0);
        }
      }
    });
    const revenueData = Array.from(revenueMap.values());

    // 4. Vendas Diárias e Mensais
    const dailySales = [];
    const monthlySalesMap = new Map();
    let salesDate = new Date(startRange);
    while (salesDate <= endRange) {
      const dateKey = salesDate.toISOString().split('T')[0];
      const [year, month] = dateKey.split('-');
      const monthKey = `${month}/${year}`;
      dailySales.push({ date: dateKey, amount: 0 });
      if (!monthlySalesMap.has(monthKey)) monthlySalesMap.set(monthKey, { month: monthKey, amount: 0 });
      salesDate.setDate(salesDate.getDate() + 1);
    }

    const pharmacyOrders = await prisma.pharmacyOrder.findMany({
      where: { createdAt: { gte: startRange, lte: endRange } },
      select: { createdAt: true, total: true }
    });

    pharmacyOrders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const [year, month] = dateKey.split('-');
      const monthKey = `${month}/${year}`;
      
      const dailyEntry = dailySales.find(d => d.date === dateKey);
      if (dailyEntry) dailyEntry.amount += Number(order.total || 0);
      
      const monthlyEntry = monthlySalesMap.get(monthKey);
      if (monthlyEntry) monthlyEntry.amount += Number(order.total || 0);
    });
    const monthlySales = Array.from(monthlySalesMap.values());

    // 5. Top 20 Parceiros por Consultas
    const appointments = await prisma.appointment.findMany({
      where: { status: 'COMPLETED', createdAt: { gte: startRange, lte: endRange }, partnerId: { not: null } },
      select: { partnerId: true }
    });
    
    const partnerCount = new Map();
    appointments.forEach(app => {
      const current = partnerCount.get(app.partnerId) || 0;
      partnerCount.set(app.partnerId, current + 1);
    });
    
    const sortedPartners = Array.from(partnerCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    const partnerIds = sortedPartners.map(([id]) => id);
    const partners = await prisma.partner.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, name: true }
    });
    const partnerMap = new Map(partners.map(p => [p.id, p.name]));
    
    const topServices = sortedPartners.map(([id, count]) => ({
      name: partnerMap.get(id) || 'Parceiro Desconhecido',
      count,
      revenue: 0
    }));

    // Recent Activity
    const [recentUsers, recentAudit] = await Promise.all([
      prisma.user.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, createdAt: true, role: true } }),
      prisma.auditLog.findMany({ take: 5, orderBy: { timestamp: 'desc' }, select: { id: true, action: true, userName: true, timestamp: true } })
    ]);

    const recentActivities = [
      ...recentUsers.map(u => ({ id: `u-${u.id}`, type: 'user', action: 'Novo usuário', user: u.name, time: u.createdAt })),
      ...recentAudit.map(aud => ({ id: `aud-${aud.id || aud.timestamp.getTime()}`, type: 'system', action: aud.action, user: aud.userName || 'Sistema', time: aud.timestamp }))
    ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);

    const responseData = {
      totalUsers: userStats.reduce((acc, curr) => acc + curr._count._all, 0),
      totalPatients: getCountByRole('PATIENT'),
      totalPartners: getCountByRole('PARTNER'),
      totalAdmins,
      totalAppointments,
      completedAppointments,
      totalPharmacies,
      growth: {
        users: calcGrowth(currUsers, prevUsers),
        patients: calcGrowth(currPatients, prevPatients),
        partners: calcGrowth(currPartners, prevPartners),
        appointments: calcGrowth(currAppts, prevAppts),
        pharmacies: calcGrowth(currPharmacies, prevPharmacies)
      },
      userGrowthData,
      appointmentsBySpecialty,
      revenueData,
      dailySales,
      monthlySales,
      topServices,
      recentActivities
    };
    
    console.log('✅ Dados do dashboard prontos para retorno:', {
      totalUsers: responseData.totalUsers,
      totalPatients: responseData.totalPatients,
      totalPartners: responseData.totalPartners,
      totalPharmacies: responseData.totalPharmacies
    });

    return res.json(responseData);
  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
  }
});

export default router;
