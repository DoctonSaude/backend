"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const revenue_service_js_1 = require("../../services/revenue.service.js");
const router = (0, express_1.Router)();
/**
 * @route GET /api/partners/dashboard
 */
router.get('/dashboard', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    res.setHeader('X-Backend-Version', '2026.04.09.v6-modular');
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { userId },
            select: { id: true, rating: true, totalReviews: true, createdAt: true }
        });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const [totalAppointments, completedAppointments, upcomingAppointments, thisMonthAppts, lastMonthAppts, monthlyRevenueData, lastMonthRevenueData, recentAppointments, validatedCodes] = await Promise.all([
            prisma_js_1.default.appointment.count({ where: { partnerId: partner.id } }),
            prisma_js_1.default.appointment.count({ where: { partnerId: partner.id, status: 'COMPLETED' } }),
            prisma_js_1.default.appointment.count({ where: { partnerId: partner.id, status: { in: ['SCHEDULED', 'CONFIRMED'] } } }),
            prisma_js_1.default.appointment.count({ where: { partnerId: partner.id, createdAt: { gte: startOfMonth } } }),
            prisma_js_1.default.appointment.count({ where: { partnerId: partner.id, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
            prisma_js_1.default.transaction.aggregate({
                where: { partnerId: partner.id, type: 'CREDIT', status: 'COMPLETED', createdAt: { gte: startOfMonth } },
                _sum: { amount: true }
            }),
            prisma_js_1.default.transaction.aggregate({
                where: { partnerId: partner.id, type: 'CREDIT', status: 'COMPLETED', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
                _sum: { amount: true }
            }),
            prisma_js_1.default.appointment.findMany({
                where: { partnerId: partner.id },
                orderBy: { dateTime: 'desc' },
                take: 5,
                include: { patient: { include: { user: { select: { name: true, avatar: true } } } } }
            }),
            prisma_js_1.default.validationCodeLog.findMany({
                where: { partnerId: partner.id },
                orderBy: { timestamp: 'desc' },
                take: 10,
                include: { patient: { select: { user: { select: { name: true, avatar: true } } } } }
            })
        ]);
        const rev = monthlyRevenueData._sum.amount || 0;
        const lastRev = lastMonthRevenueData._sum.amount || 0;
        const revGrowth = lastRev > 0 ? ((rev - lastRev) / lastRev) * 100 : 0;
        const apptsGrowth = lastMonthAppts > 0 ? ((thisMonthAppts - lastMonthAppts) / lastMonthAppts) * 100 : 0;
        const period = req.query.period || 'week';
        const chartStartDate = new Date();
        if (period === 'week')
            chartStartDate.setDate(chartStartDate.getDate() - 6);
        else
            chartStartDate.setDate(chartStartDate.getDate() - 29);
        chartStartDate.setHours(0, 0, 0, 0);
        const [dailyRevenue, dailyAppts] = await Promise.all([
            prisma_js_1.default.transaction.findMany({
                where: { partnerId: partner.id, status: 'COMPLETED', type: 'CREDIT', createdAt: { gte: chartStartDate } },
                select: { amount: true, createdAt: true }
            }),
            prisma_js_1.default.appointment.findMany({
                where: { partnerId: partner.id, dateTime: { gte: chartStartDate } },
                select: { dateTime: true }
            })
        ]);
        const daysToGenerate = period === 'week' ? 7 : 30;
        const chartData = Array.from({ length: daysToGenerate }, (_, i) => {
            const d = new Date(chartStartDate);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayRev = dailyRevenue.filter(r => r.createdAt.toISOString().split('T')[0] === dateStr).reduce((sum, r) => sum + r.amount, 0);
            const dayAppts = dailyAppts.filter(a => a.dateTime.toISOString().split('T')[0] === dateStr).length;
            return {
                name: period === 'week' ? (0, date_fns_1.format)(d, 'EEE', { locale: locale_1.ptBR }) : (0, date_fns_1.format)(d, 'dd/MM'),
                value: dayRev,
                appts: dayAppts
            };
        });
        return res.json({
            metrics: {
                newAppointments: thisMonthAppts,
                monthlyRevenue: rev,
                revenueGrowth: Math.round(revGrowth),
                completedAppointments,
                apptsGrowth: Math.round(apptsGrowth),
                upcomingAppointments,
                rating: partner.rating || 0,
                totalReviews: partner.totalReviews || 0
            },
            recentAppointments: recentAppointments.map(appt => ({
                id: appt.id,
                patientName: appt.patient?.user?.name || 'Paciente',
                patientAvatar: appt.patient?.user?.avatar,
                dateTime: appt.dateTime,
                status: appt.status,
                isOnline: appt.isOnline
            })),
            validatedCodes: validatedCodes.map(log => ({
                id: log.id,
                code: log.code,
                patientName: log.patient?.user?.name || 'Paciente',
                patientAvatar: log.patient?.user?.avatar,
                timestamp: log.timestamp,
                status: log.status
            })),
            chartData: chartData
        });
    }
    catch (error) {
        console.error('Erro ao obter dashboard do parceiro:', error);
        return res.status(500).json({ error: 'Erro ao obter dashboard do parceiro' });
    }
});
/**
 * @route GET /api/partners/revenue/insights
 */
router.get('/revenue/insights', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER', 'PHARMACY'), async (req, res) => {
    res.setHeader('X-Backend-Version', '2026.04.09.v6-modular');
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const insights = await revenue_service_js_1.RevenueService.getInsights(partner.id);
        return res.json(insights);
    }
    catch (error) {
        console.error(`[Partners/Insights] Erro:`, error?.message);
        return res.status(500).json({ error: 'Erro interno ao gerar insights' });
    }
});
exports.default = router;
//# sourceMappingURL=finance.routes.js.map