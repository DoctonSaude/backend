"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPartnerData = void 0;
// @ts-nocheck
const express_1 = require("express");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const router = (0, express_1.Router)();
// Helper para mapear dados do parceiro para o frontend
const mapPartnerData = (p) => {
    let finalPrice = p.consultationPrice || 0;
    const activeServices = p.services?.filter((s) => s.isActive) || [];
    const consulService = activeServices.find((s) => (s.category && s.category.toLowerCase().includes('consulta')) ||
        (s.name && s.name.toLowerCase().includes('consulta'))) || activeServices[0];
    if (consulService) {
        if (typeof consulService.partnerPayout === 'number' && typeof consulService.doctonFeePercent === 'number') {
            finalPrice = consulService.partnerPayout * (1 + (consulService.doctonFeePercent / 100));
        }
        else if (typeof consulService.basePrice === 'number') {
            finalPrice = consulService.basePrice;
        }
        else if (typeof consulService.price === 'number') {
            finalPrice = consulService.price;
        }
    }
    if (!finalPrice || finalPrice === 0)
        finalPrice = 150.00;
    const specialty = p.specialty || (p.specialties && p.specialties.length > 0 ? p.specialties.join(', ') : 'Clínica Geral');
    return {
        id: p.id,
        user: {
            name: p.user?.name || p.name || 'Profissional',
            email: p.user?.email || '',
            avatar: p.user?.avatar || undefined
        },
        type: p.type || 'CLINIC',
        specialty,
        crm: p.crm || undefined,
        description: p.description || '',
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        zipCode: p.zipCode || '',
        consultationPrice: finalPrice,
        acceptsOnline: p.acceptsOnline,
        hasOnlineScheduling: p.acceptsOnline,
        isApproved: p.isApproved,
        rating: p.rating || 0,
        totalReviews: p.totalReviews || 0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };
};
exports.mapPartnerData = mapPartnerData;
/**
 * @route GET /api/partners
 */
router.get('/', async (req, res) => {
    try {
        const partners = await prisma_js_1.default.partner.findMany({
            where: { isApproved: true },
            select: {
                id: true, name: true, type: true, specialty: true, specialties: true,
                crm: true, description: true, address: true, city: true, state: true,
                zipCode: true, consultationPrice: true, acceptsOnline: true,
                isApproved: true, rating: true, totalReviews: true, createdAt: true, updatedAt: true,
                user: { select: { name: true, email: true, avatar: true } },
                services: { where: { isActive: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(partners.map(exports.mapPartnerData));
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao listar parceiros' });
    }
});
/**
 * @route GET /api/partners/search
 */
router.get('/search', async (req, res) => {
    const q = req.query.q?.trim();
    if (!q)
        return res.json([]);
    try {
        const whereClause = {
            OR: [
                { specialty: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
                { state: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
                { user: { name: { contains: q, mode: 'insensitive' } } }
            ]
        };
        const partners = await prisma_js_1.default.partner.findMany({
            where: whereClause,
            select: {
                id: true, name: true, type: true, specialty: true, specialties: true,
                crm: true, description: true, address: true, city: true, state: true,
                zipCode: true, consultationPrice: true, acceptsOnline: true,
                isApproved: true, rating: true, totalReviews: true, createdAt: true, updatedAt: true,
                user: { select: { name: true, email: true, avatar: true } },
                services: { where: { isActive: true } }
            }
        });
        return res.json(partners.map(exports.mapPartnerData));
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro na busca' });
    }
});
/**
 * @route GET /api/partners/public-profile
 */
router.get('/public-profile', async (req, res) => {
    try {
        const { partnerId } = req.query;
        if (!partnerId)
            return res.status(400).json({ error: 'ID não fornecido' });
        const partner = await prisma_js_1.default.partner.findUnique({
            where: { id: partnerId },
            include: {
                user: { select: { name: true, avatar: true, email: true } },
                team: true,
                services: { where: { isActive: true }, orderBy: { createdAt: 'desc' } }
            }
        });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const totalPatients = await prisma_js_1.default.appointment.count({ where: { partnerId: partner.id } });
        return res.json({
            ...(0, exports.mapPartnerData)(partner),
            professionals: partner.team,
            totalPatients
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar perfil público' });
    }
});
exports.default = router;
//# sourceMappingURL=public.routes.js.map