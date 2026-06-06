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
/**
 * @route GET /api/partners/services
 */
router.get('/services', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const services = await prisma_js_1.default.partnerService.findMany({
            where: { partnerId: partner.id },
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ data: services || [] });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao listar serviços' });
    }
});
/**
 * @route POST /api/partners/services
 */
router.post('/services', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const { name, description, duration, price, isOnline, isPresencial, category, discountBasic, discountPremium, discountEnterprise, basePrice } = req.body;
        if (!name || price === undefined || duration === undefined) {
            return res.status(400).json({ error: 'Nome, preço e duração são obrigatórios' });
        }
        const service = await prisma_js_1.default.partnerService.create({
            data: {
                partnerId: partner.id,
                name,
                description: description || '',
                duration: Number(duration),
                price: Number(price),
                basePrice: basePrice ? Number(basePrice) : Number(price),
                isOnline: !!isOnline,
                isPresencial: !!isPresencial,
                category: category || 'Consulta',
                isActive: true,
                discountBasic: Number(discountBasic || 0),
                discountPremium: Number(discountPremium || 0),
                discountEnterprise: Number(discountEnterprise || 0),
            }
        });
        return res.status(201).json(service);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao criar serviço' });
    }
});
/**
 * @route PUT /api/partners/services/:serviceId
 */
router.put('/services/:serviceId', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const { name, description, duration, price, isOnline, isPresencial, category, isActive, discountBasic, discountPremium, discountEnterprise, basePrice } = req.body;
        const service = await prisma_js_1.default.partnerService.update({
            where: { id: req.params.serviceId, partnerId: partner.id },
            data: {
                name, description, category,
                duration: duration !== undefined ? Number(duration) : undefined,
                price: price !== undefined ? Number(price) : undefined,
                basePrice: basePrice !== undefined ? Number(basePrice) : undefined,
                isOnline: isOnline !== undefined ? !!isOnline : undefined,
                isPresencial: isPresencial !== undefined ? !!isPresencial : undefined,
                isActive: isActive !== undefined ? !!isActive : undefined,
                discountBasic: discountBasic !== undefined ? Number(discountBasic) : undefined,
                discountPremium: discountPremium !== undefined ? Number(discountPremium) : undefined,
                discountEnterprise: discountEnterprise !== undefined ? Number(discountEnterprise) : undefined,
            }
        });
        return res.json(service);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar serviço' });
    }
});
/**
 * @route DELETE /api/partners/services/:serviceId
 */
router.delete('/services/:serviceId', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        await prisma_js_1.default.partnerService.delete({
            where: { id: req.params.serviceId, partnerId: partner.id }
        });
        return res.status(204).send();
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao excluir serviço' });
    }
});
/**
 * @route GET /api/partners/combos
 */
router.get('/combos', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER', 'PHARMACY'), async (req, res) => {
    res.json({ data: [] }); // Funcionalidade legada
});
exports.default = router;
//# sourceMappingURL=services.routes.js.map