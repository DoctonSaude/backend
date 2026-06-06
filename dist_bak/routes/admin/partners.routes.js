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
 * @route GET /api/admin/partners
 */
router.get('/partners', ...adminAuth, async (req, res) => {
    try {
        const { status, q } = req.query;
        const where = {};
        if (status === 'pending')
            where.isApproved = false;
        if (status === 'active')
            where.isApproved = true;
        if (q) {
            where.OR = [
                { name: { contains: String(q), mode: 'insensitive' } },
                { city: { contains: String(q), mode: 'insensitive' } },
                { specialty: { contains: String(q), mode: 'insensitive' } }
            ];
        }
        const partners = await prisma_js_1.default.partner.findMany({
            where,
            include: {
                user: { select: { email: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(partners);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar parceiros' });
    }
});
/**
 * @route GET /api/admin/partners/:id
 */
router.get('/partners/:id', ...adminAuth, async (req, res) => {
    try {
        const partner = await prisma_js_1.default.partner.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { email: true, phone: true, name: true } },
                services: true,
                addresses: true
            }
        });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        return res.json(partner);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar parceiro' });
    }
});
/**
 * @route PUT /api/admin/partners/:id
 */
router.put('/partners/:id', ...adminAuth, async (req, res) => {
    const body = req.body || {};
    try {
        const updated = await prisma_js_1.default.partner.update({
            where: { id: req.params.id },
            data: {
                name: body.name,
                specialty: body.specialty,
                city: body.city,
                state: body.state,
                isApproved: body.isApproved,
                commissionRate: body.commissionRate ? Number(body.commissionRate) : undefined,
                updatedAt: new Date()
            }
        });
        await prisma_js_1.default.auditLog.create({
            data: {
                action: 'PARTNER_UPDATED',
                resource: 'Partner',
                resourceId: updated.id,
                userName: req.user?.userId ? String(req.user.userId) : 'Admin',
                userRole: 'ADMIN',
                ipAddress: req.ip || '127.0.0.1',
                details: body
            }
        });
        return res.json(updated);
    }
    catch (error) {
        res.status(404).json({ error: 'Parceiro não encontrado' });
    }
});
/**
 * @route DELETE /api/admin/partners/:id
 */
router.delete('/partners/:id', ...adminAuth, async (req, res) => {
    try {
        await prisma_js_1.default.partner.delete({ where: { id: req.params.id } });
        return res.json({ success: true });
    }
    catch (error) {
        res.status(404).json({ error: 'Parceiro não encontrado' });
    }
});
/**
 * @route POST /api/admin/partners/:id/approve
 */
router.post('/partners/:id/approve', ...adminAuth, async (req, res) => {
    try {
        const updated = await prisma_js_1.default.partner.update({
            where: { id: req.params.id },
            data: { isApproved: true, updatedAt: new Date() }
        });
        // Notificar usuário?
        return res.json(updated);
    }
    catch (error) {
        res.status(404).json({ error: 'Parceiro não encontrado' });
    }
});
exports.default = router;
//# sourceMappingURL=partners.routes.js.map