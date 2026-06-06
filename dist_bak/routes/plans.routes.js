"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Listar planos (disponível para Pacientes e Admins)
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const plans = await prisma_1.default.plan.findMany({
            include: {
                _count: {
                    select: { subscriptions: true }
                }
            },
            orderBy: { price: 'asc' }
        });
        const formatted = plans.map(p => ({
            ...p,
            subscribers: p._count.subscriptions
        }));
        res.json({ data: formatted });
    }
    catch (error) {
        console.error('Error getting plans:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});
// Create Plan
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const schema = zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string().optional(),
            price: zod_1.z.number(),
            interval: zod_1.z.string(),
            features: zod_1.z.array(zod_1.z.string()),
            isActive: zod_1.z.boolean().optional(),
            key: zod_1.z.string().optional(),
        });
        const data = schema.parse(req.body);
        // Generate key if missing
        let key = data.key;
        if (!key) {
            key = data.name.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
                .replace(/[^a-z0-9]+/g, '-') // replace non-alphanum with dash
                .replace(/^-+|-+$/g, ''); // trim dashes
            // Ensure unique
            const existing = await prisma_1.default.plan.findUnique({ where: { key } });
            if (existing) {
                key = `${key}-${Date.now().toString().slice(-4)}`;
            }
        }
        const plan = await prisma_1.default.plan.create({
            data: {
                name: data.name,
                description: data.description,
                price: data.price,
                interval: data.interval,
                features: JSON.stringify(data.features),
                isActive: data.isActive ?? true,
                key: key
            }
        });
        res.json({ data: plan });
    }
    catch (error) {
        console.error('Error creating plan:', error);
        res.status(400).json({ error: 'Failed to create plan' });
    }
});
// Update Plan
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        // Filter only valid Plan model fields - exclude computed fields
        const { name, description, price, interval, features, isActive, key } = req.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (description !== undefined)
            updateData.description = description;
        if (price !== undefined)
            updateData.price = Number(price);
        if (interval !== undefined)
            updateData.interval = interval;
        if (features !== undefined) {
            updateData.features = Array.isArray(features) ? JSON.stringify(features) : features;
        }
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (key !== undefined)
            updateData.key = key;
        const plan = await prisma_1.default.plan.update({
            where: { id },
            data: updateData
        });
        res.json({ data: plan });
    }
    catch (error) {
        console.error('Error updating plan:', error);
        res.status(500).json({ error: 'Failed to update plan' });
    }
});
// Delete Plan
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        // Check for subscriptions
        const subs = await prisma_1.default.subscription.count({ where: { planId: id } });
        if (subs > 0) {
            return res.status(400).json({ error: 'Plan has subscriptions and cannot be deleted' });
        }
        await prisma_1.default.plan.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting plan:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});
// Plan Stats
router.get('/stats', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { month, year } = req.query;
        const total = await prisma_1.default.plan.count();
        const activePlans = await prisma_1.default.plan.count({ where: { isActive: true } });
        let subscriptionWhere = { status: 'ACTIVE' };
        if (month && year) {
            const m = Number(month);
            const y = Number(year);
            const startDate = new Date(y, m - 1, 1);
            const endDate = new Date(y, m, 0, 23, 59, 59);
            subscriptionWhere = {
                createdAt: { lte: endDate },
                OR: [
                    { status: 'ACTIVE' },
                    { cancelledAt: { gte: startDate } }
                ]
            };
        }
        const subscriptions = await prisma_1.default.subscription.findMany({
            where: subscriptionWhere,
            include: { plan: true }
        });
        const totalSubscribers = subscriptions.length;
        const revenue = subscriptions.reduce((acc, sub) => {
            if (!sub.plan)
                return acc;
            let amount = sub.plan.price;
            if (sub.plan.interval === 'YEARLY')
                amount = amount / 12;
            return acc + amount;
        }, 0);
        const basicPlan = await prisma_1.default.plan.findFirst({ where: { name: { contains: 'Básico', mode: 'insensitive' } } });
        const premiumPlan = await prisma_1.default.plan.findFirst({ where: { name: { contains: 'Premium', mode: 'insensitive' } } });
        const basicCount = basicPlan ? subscriptions.filter(s => s.planId === basicPlan.id).length : 0;
        const premiumCount = premiumPlan ? subscriptions.filter(s => s.planId === premiumPlan.id).length : 0;
        res.json({
            data: {
                totalPlans: total,
                activePlans,
                totalSubscribers,
                monthlyRevenue: revenue,
                basicPlanSubscribers: basicCount,
                premiumPlanSubscribers: premiumCount,
                growth: 0
            }
        });
    }
    catch (error) {
        console.error('Error getting plan stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
// Plan Activity
router.get('/activity', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { page = 1, pageSize = 5, month, year } = req.query;
        const skip = (Number(page) - 1) * Number(pageSize);
        const take = Number(pageSize);
        let where = {};
        if (month && year) {
            const m = Number(month);
            const y = Number(year);
            where = {
                createdAt: {
                    gte: new Date(y, m - 1, 1),
                    lte: new Date(y, m, 0, 23, 59, 59)
                }
            };
        }
        const [items, total] = await prisma_1.default.$transaction([
            prisma_1.default.subscription.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: {
                        include: {
                            user: {
                                select: { name: true, email: true }
                            }
                        }
                    },
                    plan: { select: { name: true } }
                }
            }),
            prisma_1.default.subscription.count({ where })
        ]);
        const formatted = items.map(item => ({
            id: item.id,
            name: item.patient?.user?.name || 'Usuário Removido',
            plan: item.plan?.name || 'Plano Removido',
            date: item.createdAt,
            status: item.status
        }));
        res.json({
            data: {
                items: formatted,
                total,
                page: Number(page),
                pageSize: Number(pageSize)
            }
        });
    }
    catch (error) {
        console.error('Error getting activity:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});
exports.default = router;
//# sourceMappingURL=plans.routes.js.map