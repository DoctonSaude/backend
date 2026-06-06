// @ts-nocheck
import { Router } from 'express';
import prisma from '../lib/prisma';
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Helper to sync plan with Supabase
const syncPlanWithSupabase = async (plan: any, operation: 'create' | 'update' | 'delete') => {
    if (!supabase) {
        console.warn('⚠️ Supabase client not initialized - skipping sync');
        return;
    }
    
    try {
        console.log(`🔄 Syncing plan with Supabase (operation: ${operation})`, plan.id);
        
        if (operation === 'delete') {
            const { error } = await supabase.from('plans').delete().eq('id', plan.id);
            if (error) {
                console.error('❌ Error deleting plan from Supabase:', error);
                throw error;
            }
            console.log('✅ Plan deleted from Supabase successfully');
        } else {
            const supabasePlan = {
                id: plan.id,
                key: plan.key,
                name: plan.name,
                description: plan.description,
                price: plan.price,
                interval: plan.interval,
                features: plan.features,
                featuresArray: plan.featuresArray,
                isActive: plan.isActive,
                isPopular: plan.isPopular,
                displayPrice: plan.displayPrice,
                order: plan.order,
                ctaLink: plan.ctaLink,
                ctaText: plan.ctaText,
                createdAt: plan.createdAt?.toISOString ? plan.createdAt.toISOString() : plan.createdAt,
                updatedAt: plan.updatedAt?.toISOString ? plan.updatedAt.toISOString() : plan.updatedAt
            };
            
            console.log('📦 Supabase plan data:', supabasePlan);
            
            if (operation === 'create') {
                const { error } = await supabase.from('plans').insert([supabasePlan]);
                if (error) {
                    console.error('❌ Error inserting plan into Supabase:', error);
                    throw error;
                }
                console.log('✅ Plan created in Supabase successfully');
            } else if (operation === 'update') {
                const { error } = await supabase.from('plans').update(supabasePlan).eq('id', plan.id);
                if (error) {
                    console.error('❌ Error updating plan in Supabase:', error);
                    throw error;
                }
                console.log('✅ Plan updated in Supabase successfully');
            }
        }
    } catch (error) {
        console.error('❌ Error syncing plan with Supabase:', error);
    }
};

// Listar planos (disponível para Pacientes e Admins)
router.get('/', authenticate, async (req, res) => {
    try {
        const plans = await prisma.plan.findMany({
            include: {
                _count: {
                    select: {
                        Subscription: true
                    }
                }
            },
            orderBy: { price: 'asc' }
        });

        const formatted = plans.map(p => ({
            ...p,
            subscribers: p._count.Subscription
        }));

        res.json({ data: formatted });
    } catch (error) {
        console.error('Error getting plans:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});

// Create Plan
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const schema = z.object({
            name: z.string(),
            description: z.string().optional(),
            price: z.number(),
            interval: z.string(),
            features: z.array(z.string()),
            isActive: z.boolean().optional(),
            isPopular: z.boolean().optional(),
            key: z.string().optional(),
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
            const existing = await prisma.plan.findUnique({ where: { key } });
            if (existing) {
                key = `${key}-${Date.now().toString().slice(-4)}`;
            }
        }

        const plan = await prisma.plan.create({
            data: {
                name: data.name,
                description: data.description,
                price: data.price,
                interval: data.interval,
                features: JSON.stringify(data.features),
                featuresArray: data.features,
                isActive: data.isActive ?? true,
                isPopular: data.isPopular ?? false,
                key: key!
            }
        });

        // Sync with Supabase
        await syncPlanWithSupabase(plan, 'create');

        res.json({ data: plan });
    } catch (error) {
        console.error('Error creating plan:', error);
        res.status(400).json({ error: 'Failed to create plan' });
    }
});

// Update Plan
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;

        // Filter only valid Plan model fields - exclude computed fields
        const { name, description, price, interval, features, isActive, isPopular, key } = req.body;
        const updateData: Record<string, any> = {};

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = Number(price);
        if (interval !== undefined) updateData.interval = interval;
        if (features !== undefined) {
            updateData.features = Array.isArray(features) ? JSON.stringify(features) : features;
            updateData.featuresArray = Array.isArray(features) ? features : [];
        }
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isPopular !== undefined) updateData.isPopular = isPopular;
        if (key !== undefined) updateData.key = key;

        const plan = await prisma.plan.update({
            where: { id },
            data: updateData
        });

        // Sync with Supabase
        await syncPlanWithSupabase(plan, 'update');

        res.json({ data: plan });
    } catch (error) {
        console.error('Error updating plan:', error);
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

// Delete Plan
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        // Check for subscriptions
        const subs = await prisma.subscription.count({ where: { planId: id } });
        if (subs > 0) {
            return res.status(400).json({ error: 'Plan has subscriptions and cannot be deleted' });
        }

        // Get plan before deleting
        const plan = await prisma.plan.findUnique({ where: { id } });
        await prisma.plan.delete({ where: { id } });

        // Sync with Supabase
        if (plan) {
            await syncPlanWithSupabase(plan, 'delete');
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting plan:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});

// Plan Stats
router.get('/stats', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { month, year } = req.query;
        const total = await prisma.plan.count();
        const activePlans = await prisma.plan.count({ where: { isActive: true } });

        let subscriptionWhere: any = { status: 'ACTIVE' };
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

        const subscriptions = await prisma.subscription.findMany({
            where: subscriptionWhere,
            include: { Plan: true }
        });

        const totalSubscribers = subscriptions.length;
        const revenue = subscriptions.reduce((acc, sub) => {
            if (!sub.Plan) return acc;
            let amount = sub.Plan.price;
            if (sub.Plan.interval === 'YEARLY') amount = amount / 12;
            return acc + amount;
        }, 0);

        const basicPlan = await prisma.plan.findFirst({ where: { name: { contains: 'Básico', mode: 'insensitive' } } });
        const premiumPlan = await prisma.plan.findFirst({ where: { name: { contains: 'Premium', mode: 'insensitive' } } });

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
    } catch (error) {
        console.error('Error getting plan stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Plan Activity
router.get('/activity', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { page = 1, pageSize = 5, month, year } = req.query;
        const skip = (Number(page) - 1) * Number(pageSize);
        const take = Number(pageSize);

        let where: any = {};
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

        const [items, total] = await prisma.$transaction([
            prisma.subscription.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    Patient: {
                        include: {
                            User: {
                                select: { name: true, email: true }
                            }
                        }
                    },
                    Plan: { select: { name: true } }
                }
            }),
            prisma.subscription.count({ where })
        ]);

        const formatted = (items as any[]).map(item => ({
            id: item.id,
            name: item.Patient?.User?.name || 'Usuário Removido',
            plan: item.Plan?.name || 'Plano Removido',
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
    } catch (error) {
        console.error('Error getting activity:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// Sync all plans with Supabase
router.post('/sync-all', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        console.log('🔄 Starting full sync of all plans with Supabase...');
        
        const plans = await prisma.plan.findMany();
        console.log(`📋 Found ${plans.length} plans to sync`);

        const results = [];
        for (const plan of plans) {
            try {
                await syncPlanWithSupabase(plan, 'update');
                results.push({ id: plan.id, name: plan.name, success: true });
            } catch (error) {
                console.error(`❌ Failed to sync plan ${plan.id}:`, error);
                results.push({ id: plan.id, name: plan.name, success: false, error: String(error) });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        console.log(`✅ Sync completed: ${successCount} succeeded, ${failCount} failed`);

        res.json({
            success: true,
            data: {
                total: plans.length,
                succeeded: successCount,
                failed: failCount,
                results
            }
        });
    } catch (error) {
        console.error('❌ Error syncing all plans:', error);
        res.status(500).json({ error: 'Failed to sync plans' });
    }
});

export default router;
