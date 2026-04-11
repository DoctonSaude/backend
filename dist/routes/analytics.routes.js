"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Validação para eventos de analytics
const analyticsValidation = [
    (0, express_validator_1.body)('event').notEmpty().withMessage('Event é obrigatório'),
    (0, express_validator_1.body)('properties').optional().isObject(),
];
const adminAuth = process.env.NODE_ENV === 'development' ? [] : [auth_1.authenticate, (0, auth_1.authorize)('ADMIN')];
// Rota para receber eventos de analytics
router.post('/track', analyticsValidation, async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { event, properties, userId, timestamp } = req.body;
    try {
        const parsedTimestamp = timestamp ? new Date(isNaN(Number(timestamp)) ? timestamp : Number(timestamp)) : new Date();
        await prisma_1.default.analyticsEvent.create({
            data: {
                event,
                properties: properties ? JSON.stringify(properties) : '{}',
                propertiesJson: properties || {},
                userId: userId || 'anonymous',
                timestamp: parsedTimestamp,
                sessionId: properties?.sessionId,
                page: properties?.page || properties?.path,
            },
        });
        res.status(200).json({ success: true, message: 'Event tracked' });
    }
    catch (error) {
        console.error('Error tracking event:', error);
        // Fallback: log do evento sem salvar no banco
        console.log(`[Analytics Fallback] Event: ${event}`, {
            userId: userId || 'anonymous',
            timestamp: timestamp || new Date(),
            properties: properties || {}
        });
        res.status(200).json({
            success: true,
            message: 'Event tracked (logged only - DB unavailable)',
            fallback: true
        });
    }
});
// Rota para receber batch de eventos de analytics
router.post('/track-batch', [
    (0, express_validator_1.body)('events').isArray().withMessage('Events deve ser um array'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'Events deve ser um array não vazio' });
    }
    try {
        await prisma_1.default.analyticsEvent.createMany({
            data: events.map((e) => ({
                event: e.event,
                properties: e.properties ? JSON.stringify(e.properties) : '{}',
                propertiesJson: e.properties || {},
                userId: e.userId || 'anonymous',
                timestamp: e.timestamp ? new Date(isNaN(Number(e.timestamp)) ? e.timestamp : Number(e.timestamp)) : new Date(),
                sessionId: e.sessionId || e.properties?.sessionId,
                page: e.page || e.properties?.page || e.properties?.path,
            })),
        });
        res.status(200).json({ success: true, message: `${events.length} events processed` });
    }
    catch (error) {
        console.error('Error tracking batch events:', error);
        // Fallback: log dos eventos sem salvar no banco
        events.forEach((eventData, index) => {
            console.log(`[Analytics Batch Fallback ${index + 1}] Event: ${eventData.event}`, {
                userId: eventData.userId || 'anonymous',
                timestamp: eventData.timestamp || new Date(),
                properties: eventData.properties || {}
            });
        });
        res.status(200).json({
            success: true,
            message: `${events.length} events processed (logged only - DB unavailable)`,
            fallback: true
        });
    }
});
// Rota para obter visão geral real
router.get('/overview', ...adminAuth, async (req, res) => {
    try {
        const [totalUsers, totalPartners, totalRevenueData, totalAppointments] = await Promise.all([
            prisma_1.default.user.count(),
            prisma_1.default.partner.count(),
            prisma_1.default.transaction.aggregate({
                where: { type: 'INCOME' },
                _sum: { amount: true }
            }),
            prisma_1.default.appointment.count()
        ]);
        // Calcular taxa de conversão baseada em eventos
        const starts = await prisma_1.default.analyticsEvent.count({ where: { event: 'registration_started' } });
        const completions = await prisma_1.default.analyticsEvent.count({ where: { event: 'registration_completed' } });
        const conversionRate = starts > 0 ? (completions / starts) * 100 : 0;
        // Calcular NPS / Satisfação Real
        const reviews = await prisma_1.default.review.findMany({ select: { rating: true } });
        const satisfaction = reviews.length > 0
            ? Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10) / 10
            : 5.0;
        // Calcular Churn Rate Real
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [activeSubs, cancelledSubs] = await Promise.all([
            prisma_1.default.subscription.count({ where: { status: 'ACTIVE' } }),
            prisma_1.default.subscription.count({
                where: {
                    status: 'CANCELLED',
                    cancelledAt: { gte: thirtyDaysAgo }
                }
            })
        ]);
        const totalBase = activeSubs + cancelledSubs;
        const churnRate = totalBase > 0 ? (cancelledSubs / totalBase) * 100 : 0;
        res.json({
            totalUsers,
            totalPartners,
            totalRevenue: totalRevenueData._sum.amount || 0,
            totalAppointments,
            conversionRate,
            customerSatisfaction: satisfaction,
            churnRate: Math.round(churnRate * 100) / 100
        });
    }
    catch (error) {
        console.error('Error getting overview:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Rota para obter estatísticas de registro
router.get('/registration-stats', ...adminAuth, async (req, res) => {
    try {
        const dbEvents = await prisma_1.default.analyticsEvent.findMany({
            where: { event: { startsWith: 'registration_' } },
        });
        const registrationEvents = dbEvents.map((e) => ({
            event: e.event,
            properties: e.properties || {},
            userId: e.userId,
            timestamp: Number(e.timestamp),
            sessionId: e.sessionId,
            page: e.page,
            createdAt: e.createdAt.toISOString(),
        }));
        const stats = {
            totalStarts: registrationEvents.filter(e => e.event === 'registration_started').length,
            totalCompletions: registrationEvents.filter(e => e.event === 'registration_completed').length,
            totalErrors: registrationEvents.filter(e => e.event === 'registration_error').length,
            averageTime: calculateAverageTime(registrationEvents),
            completionRate: calculateCompletionRate(registrationEvents),
            errorsByStep: groupErrorsByStep(registrationEvents),
            byRole: groupByRole(registrationEvents),
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error getting registration stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Rota para obter estatísticas de verificação de email
router.get('/email-verification-stats', ...adminAuth, async (req, res) => {
    try {
        const dbEvents = await prisma_1.default.analyticsEvent.findMany({
            where: { event: 'email_verification' },
        });
        const events = dbEvents.map((e) => ({
            event: e.event,
            properties: e.properties || {},
            timestamp: Number(e.timestamp),
            createdAt: e.createdAt.toISOString(),
        }));
        const stats = {
            totalSent: events.filter(e => e.properties.status === 'sent').length,
            totalVerified: events.filter(e => e.properties.status === 'verified').length,
            totalFailed: events.filter(e => e.properties.status === 'failed').length,
            verificationRate: calculateVerificationRate(events),
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error getting email verification stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Rota para receber conversões de A/B testing
router.post('/ab-testing/conversion', async (req, res) => {
    const { testName, variant, conversionType } = req.body;
    if (!testName || !variant) {
        return res.status(400).json({ error: 'testName e variant são obrigatórios' });
    }
    try {
        // Redirecionamos para AnalyticsEvent pois AbTestConversion não existe no schema
        const created = await prisma_1.default.analyticsEvent.create({
            data: {
                event: `ab_test_conversion:${testName}`,
                properties: JSON.stringify({ variant, conversionType }),
                propertiesJson: { variant, conversionType },
                timestamp: new Date(),
                userId: 'anonymous'
            },
        });
        res.status(200).json({
            success: true,
            id: created.id,
            timestamp: created.timestamp
        });
    }
    catch (error) {
        console.error('Error tracking A/B conversion:', error);
        res.status(500).json({ error: 'Failed to track conversion' });
    }
});
// Rota para receber batch de conversões de A/B testing
router.post('/ab-testing/conversion-batch', [
    (0, express_validator_1.body)('conversions').isArray().withMessage('Conversions deve ser um array'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { conversions } = req.body;
    if (!Array.isArray(conversions) || conversions.length === 0) {
        return res.status(400).json({ error: 'Conversions deve ser um array não vazio' });
    }
    try {
        // Redirecionamos para AnalyticsEvent pois AbTestConversion não existe no schema
        await prisma_1.default.analyticsEvent.createMany({
            data: conversions.map((c) => ({
                event: `ab_test_batch:${c.testName}`,
                properties: JSON.stringify({ variant: c.variant, conversionType: c.conversionType }),
                propertiesJson: { variant: c.variant, conversionType: c.conversionType },
                timestamp: new Date(Number(c.timestamp || Date.now())),
                userId: 'anonymous'
            })),
        });
        res.status(200).json({ success: true, message: `${conversions.length} conversions processed` });
    }
    catch (error) {
        console.error('Error tracking A/B conversion batch:', error);
        // Fallback: log das conversões sem salvar no banco
        conversions.forEach((conv, index) => {
            console.log(`[Analytics AB Conversion Fallback ${index + 1}] Event: ab_test_batch:${conv.testName}`, {
                variant: conv.variant,
                conversionType: conv.conversionType,
                timestamp: conv.timestamp || Date.now(),
                userId: 'anonymous'
            });
        });
        res.status(200).json({
            success: true,
            message: `${conversions.length} conversions processed (logged only - DB unavailable)`,
            fallback: true
        });
    }
});
// Rota para obter resultados de A/B testing
router.get('/ab-testing/results/:testName?', ...adminAuth, async (req, res) => {
    const { testName } = req.params;
    try {
        const dbResults = await prisma_1.default.abTestConversion.findMany({
            where: testName ? { testName } : undefined,
        });
        const results = dbResults.map((r) => ({
            testName: r.testName,
            variant: r.variant,
            conversionType: r.conversionType,
            timestamp: r.timestamp,
            createdAt: r.createdAt.toISOString(),
        }));
        // Agrupar por variante
        const grouped = results.reduce((acc, result) => {
            const key = `${result.testName}_${result.variant}`;
            if (!acc[key]) {
                acc[key] = {
                    testName: result.testName,
                    variant: result.variant,
                    conversions: 0,
                    conversionTypes: {},
                };
            }
            acc[key].conversions++;
            acc[key].conversionTypes[result.conversionType] =
                (acc[key].conversionTypes[result.conversionType] || 0) + 1;
            return acc;
        }, {});
        const stats = Object.values(grouped).map((group) => ({
            ...group,
            conversionRate: group.conversions / (results.length || 1) * 100,
        }));
        res.json({ results: stats, total: results.length });
    }
    catch (error) {
        console.error('Error getting A/B results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/alerts', ...adminAuth, async (req, res) => {
    try {
        const alerts = await prisma_1.default.analyticsAlert.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(alerts);
    }
    catch (error) {
        console.error('Error listing alerts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/alerts', [...adminAuth,
    (0, express_validator_1.body)('metric').notEmpty(),
    (0, express_validator_1.body)('threshold').isNumeric(),
    (0, express_validator_1.body)('condition').isString(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { metric, threshold, condition, active } = req.body;
    try {
        const created = await prisma_1.default.analyticsAlert.create({
            data: { metric, threshold: Number(threshold), condition, active: active !== false },
        });
        res.status(201).json(created);
    }
    catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/alerts/:id', ...adminAuth, async (req, res) => {
    const { id } = req.params;
    const { metric, threshold, condition, active } = req.body;
    try {
        const updated = await prisma_1.default.analyticsAlert.update({
            where: { id },
            data: {
                metric,
                threshold: threshold !== undefined ? Number(threshold) : undefined,
                condition,
                active,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating alert:', error);
        res.status(500).json({ error: 'Failed to update alert' });
    }
});
router.delete('/alerts/:id', ...adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.analyticsAlert.delete({ where: { id } });
        res.json({ success: true, id });
    }
    catch (error) {
        console.error('Error deleting alert:', error);
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});
// Funções auxiliares
function calculateAverageTime(events) {
    const completions = events.filter(e => e.event === 'registration_completed');
    if (completions.length === 0)
        return 0;
    const times = completions
        .map(e => e.properties?.timeSpent)
        .filter(t => t && typeof t === 'number');
    if (times.length === 0)
        return 0;
    return Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
}
function calculateCompletionRate(events) {
    const starts = events.filter(e => e.event === 'registration_started').length;
    const completions = events.filter(e => e.event === 'registration_completed').length;
    if (starts === 0)
        return 0;
    return Math.round((completions / starts) * 100);
}
function calculateVerificationRate(events) {
    const sent = events.filter(e => e.properties?.status === 'sent').length;
    const verified = events.filter(e => e.properties?.status === 'verified').length;
    if (sent === 0)
        return 0;
    return Math.round((verified / sent) * 100);
}
function groupErrorsByStep(events) {
    const errors = events.filter(e => e.event === 'registration_error');
    return errors.reduce((acc, error) => {
        const step = error.properties?.step || 'unknown';
        acc[step] = (acc[step] || 0) + 1;
        return acc;
    }, {});
}
function groupByRole(events) {
    return events.reduce((acc, event) => {
        const role = event.properties?.role || 'unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
    }, {});
}
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map