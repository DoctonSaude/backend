"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const router = (0, express_1.Router)();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN')];
/**
 * @route GET /api/admin/dashboard
 */
router.get('/dashboard', ...adminAuth, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;
        // Determine Date Range
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                gte: new Date(String(startDate)),
                lte: new Date(String(endDate))
            };
            if (dateFilter.lte)
                dateFilter.lte.setHours(23, 59, 59, 999);
        }
        else {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            dateFilter = { gte: d };
        }
        // Status Agrupados
        const userStats = await prisma_js_1.default.user.groupBy({
            by: ['role'],
            _count: { _all: true }
        });
        const getCountByRole = (role) => userStats.find(s => s.role === role)?._count._all || 0;
        const [totalAppointments, completedAppointments, totalPharmacies] = await Promise.all([
            prisma_js_1.default.appointment.count(),
            prisma_js_1.default.appointment.count({ where: { status: 'COMPLETED' } }),
            prisma_js_1.default.pharmacy.count()
        ]);
        // Crescimento (Growth)
        const endRange = dateFilter.lte || new Date();
        const startRange = dateFilter.gte || new Date(new Date().setDate(new Date().getDate() - 30));
        const duration = endRange.getTime() - startRange.getTime();
        const prevStart = new Date(startRange.getTime() - duration);
        const prevEnd = new Date(startRange.getTime() - 1);
        const [currUsers, prevUsers, currPatients, prevPatients, currPartners, prevPartners, currAppts, prevAppts, currPharmacies, prevPharmacies] = await Promise.all([
            prisma_js_1.default.user.count({ where: { createdAt: { gte: startRange, lte: endRange } } }),
            prisma_js_1.default.user.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
            prisma_js_1.default.user.count({ where: { role: 'PATIENT', createdAt: { gte: startRange, lte: endRange } } }),
            prisma_js_1.default.user.count({ where: { role: 'PATIENT', createdAt: { gte: prevStart, lte: prevEnd } } }),
            prisma_js_1.default.user.count({ where: { role: 'PARTNER', createdAt: { gte: startRange, lte: endRange } } }),
            prisma_js_1.default.user.count({ where: { role: 'PARTNER', createdAt: { gte: prevStart, lte: prevEnd } } }),
            prisma_js_1.default.appointment.count({ where: { createdAt: { gte: startRange, lte: endRange } } }),
            prisma_js_1.default.appointment.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
            prisma_js_1.default.pharmacy.count({ where: { createdAt: { gte: startRange, lte: endRange } } }),
            prisma_js_1.default.pharmacy.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
        ]);
        const calcGrowth = (curr, prev) => {
            if (prev === 0)
                return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };
        // Dados para Gráficos
        const [patientsRaw, partnersRaw, pharmaciesRaw] = await Promise.all([
            prisma_js_1.default.patient.findMany({ where: { createdAt: { gte: startRange, lte: endRange } }, select: { createdAt: true } }),
            prisma_js_1.default.partner.findMany({ where: { createdAt: { gte: startRange, lte: endRange } }, select: { createdAt: true } }),
            prisma_js_1.default.pharmacy.findMany({ where: { createdAt: { gte: startRange, lte: endRange } }, select: { createdAt: true } })
        ]);
        // Simplificação de processamento de mapas para reduzir latência
        const userGrowthData = []; // Em produção seria processado de forma mais robusta
        const transactions = await prisma_js_1.default.transaction.findMany({
            where: { status: 'COMPLETED', date: { gte: startRange, lte: endRange } },
            select: { date: true, amount: true, type: true }
        });
        // Recent Activity
        const [recentUsers, recentAudit] = await Promise.all([
            prisma_js_1.default.user.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { name: true, createdAt: true, role: true } }),
            prisma_js_1.default.auditLog.findMany({ take: 5, orderBy: { timestamp: 'desc' }, select: { action: true, userName: true, timestamp: true } })
        ]);
        const recentActivities = [
            ...recentUsers.map(u => ({ id: `u-${u.name}`, type: 'user', action: 'Novo usuário', user: u.name, time: u.createdAt })),
            ...recentAudit.map(aud => ({ id: `aud-${aud.timestamp.getTime()}`, type: 'system', action: aud.action, user: aud.userName || 'Sistema', time: aud.timestamp }))
        ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);
        return res.json({
            totalUsers: userStats.reduce((acc, curr) => acc + curr._count._all, 0),
            totalPatients: getCountByRole('PATIENT'),
            totalPartners: getCountByRole('PARTNER'),
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
            recentActivities
        });
    }
    catch (error) {
        console.error('Erro no dashboard:', error);
        res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map