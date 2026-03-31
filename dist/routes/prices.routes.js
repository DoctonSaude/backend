"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)('ADMIN'));
// Get Prices (PartnerServices)
router.get('/', async (req, res) => {
    try {
        const services = await prisma_1.default.partnerService.findMany({
            include: {
                partner: {
                    select: { name: true, consultationPrice: true }
                },
                serviceCategory: {
                    select: { name: true, defaultMarkup: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Map to flatter structure if needed, or return as is.
        // Frontend expects { data: [...] } or just [...]
        // api.ts: const data = (res as any)?.data; setServices(...)
        res.json(services);
    }
    catch (error) {
        console.error('Error getting prices:', error);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});
// Create Price (PartnerService)
router.post('/', async (req, res) => {
    try {
        const schema = zod_1.z.object({
            partnerId: zod_1.z.string(),
            name: zod_1.z.string(),
            category: zod_1.z.string().optional(),
            description: zod_1.z.string().optional(),
            basePrice: zod_1.z.number().min(0),
            partnerPayout: zod_1.z.number().min(0).optional(),
            doctonFeePercent: zod_1.z.number().min(0).max(100).optional(),
            discountBasic: zod_1.z.number().min(0).max(100).optional(),
            discountPremium: zod_1.z.number().min(0).max(100).optional(),
            discountEnterprise: zod_1.z.number().min(0).max(100).optional(),
            serviceCategoryId: zod_1.z.string().optional().nullable(),
        });
        const data = schema.parse(req.body);
        console.log('[Prices] Creating with data:', JSON.stringify(data));
        // Calcular preço final (venda) se tiver repasse e markup
        let calculatedPrice = data.basePrice;
        if (data.partnerPayout !== undefined && data.doctonFeePercent !== undefined) {
            calculatedPrice = data.partnerPayout * (1 + data.doctonFeePercent / 100);
        }
        const service = await prisma_1.default.partnerService.create({
            data: {
                partnerId: data.partnerId,
                name: data.name,
                category: data.category || 'Consultas',
                description: data.description,
                price: calculatedPrice,
                basePrice: calculatedPrice,
                partnerPayout: data.partnerPayout,
                doctonFeePercent: data.doctonFeePercent,
                discountBasic: data.discountBasic || 0,
                discountPremium: data.discountPremium || 0,
                discountEnterprise: data.discountEnterprise || 0,
                duration: 30,
                isOnline: false,
                isPresencial: true,
                isActive: true,
                appointments: 0,
                serviceCategoryId: data.serviceCategoryId
            }
        });
        res.json(service);
    }
    catch (error) {
        console.error('Error creating price:', error);
        res.status(400).json({ error: 'Failed to create price' });
    }
});
// Update Price
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const schema = zod_1.z.object({
            name: zod_1.z.string().optional(),
            category: zod_1.z.string().optional(),
            description: zod_1.z.string().optional(),
            basePrice: zod_1.z.number().min(0).optional(),
            partnerPayout: zod_1.z.number().min(0).optional(),
            doctonFeePercent: zod_1.z.number().min(0).max(100).optional(),
            discountBasic: zod_1.z.number().min(0).max(100).optional(),
            discountPremium: zod_1.z.number().min(0).max(100).optional(),
            discountEnterprise: zod_1.z.number().min(0).max(100).optional(),
            isActive: zod_1.z.boolean().optional(),
            serviceCategoryId: zod_1.z.string().optional().nullable(),
        });
        const data = schema.parse(req.body);
        console.log('[Prices] Updating ID:', id, 'with data:', JSON.stringify(data, null, 2));
        // Buscar serviço atual para cálculo se necessário
        const current = await prisma_1.default.partnerService.findUnique({ where: { id } });
        if (!current)
            return res.status(404).json({ error: 'Serviço não encontrado' });
        const updateData = { ...data };
        // Recalcular preço se repasse ou markup mudarem
        const payout = data.partnerPayout !== undefined ? data.partnerPayout : current.partnerPayout;
        const markup = data.doctonFeePercent !== undefined ? data.doctonFeePercent : current.doctonFeePercent;
        if (payout !== null && markup !== null && payout !== undefined && markup !== undefined) {
            const calculatedPrice = payout * (1 + markup / 100);
            updateData.price = calculatedPrice;
            updateData.basePrice = calculatedPrice;
        }
        else if (data.basePrice !== undefined) {
            updateData.price = data.basePrice;
        }
        const service = await prisma_1.default.partnerService.update({
            where: { id },
            data: updateData
        });
        res.json(service);
    }
    catch (error) {
        console.error('Error updating price:', error);
        res.status(500).json({ error: 'Failed to update price' });
    }
});
// Delete Price
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.partnerService.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting price:', error);
        res.status(500).json({ error: 'Failed to delete price' });
    }
});
// Sincronizar descontos Gold/Premium para TODOS os serviços
router.post('/sync-discounts', async (req, res) => {
    try {
        const schema = zod_1.z.object({
            discountGold: zod_1.z.number().min(0).max(100).optional(),
            discountPremium: zod_1.z.number().min(0).max(100).optional(),
        });
        const data = schema.parse(req.body);
        console.log('[Prices] Syncing discounts to all services:', JSON.stringify(data));
        const updateData = {};
        if (data.discountGold !== undefined) {
            updateData.discountBasic = data.discountGold; // Gold = discountBasic no esquema
        }
        if (data.discountPremium !== undefined) {
            updateData.discountPremium = data.discountPremium;
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Nenhum desconto fornecido' });
        }
        // Atualizar todos os serviços
        const result = await prisma_1.default.partnerService.updateMany({
            data: updateData
        });
        console.log(`[Prices] Synced discounts to ${result.count} services`);
        res.json({
            success: true,
            updated: result.count,
            message: `Descontos aplicados a ${result.count} serviços`
        });
    }
    catch (error) {
        console.error('Error syncing discounts:', error);
        res.status(500).json({ error: 'Falha ao sincronizar descontos' });
    }
});
exports.default = router;
//# sourceMappingURL=prices.routes.js.map