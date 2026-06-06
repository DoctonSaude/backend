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
 * @route GET /api/admin/pharmacies
 */
router.get('/pharmacies', ...adminAuth, async (req, res) => {
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
                { cnpj: { contains: String(q) } }
            ];
        }
        const pharmacies = await prisma_js_1.default.pharmacy.findMany({
            where,
            include: {
                user: { select: { email: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(pharmacies);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar farmácias' });
    }
});
/**
 * @route GET /api/admin/pharmacies/:id
 */
router.get('/pharmacies/:id', ...adminAuth, async (req, res) => {
    try {
        const pharmacy = await prisma_js_1.default.pharmacy.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { email: true, phone: true, name: true } }
            }
        });
        if (!pharmacy)
            return res.status(404).json({ error: 'Farmácia não encontrada' });
        return res.json(pharmacy);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar farmácia' });
    }
});
/**
 * @route PUT /api/admin/pharmacies/:id
 */
router.put('/pharmacies/:id', ...adminAuth, async (req, res) => {
    const body = req.body || {};
    try {
        const updated = await prisma_js_1.default.pharmacy.update({
            where: { id: req.params.id },
            data: {
                name: body.name,
                cnpj: body.cnpj,
                city: body.city,
                state: body.state,
                isApproved: body.isApproved,
                updatedAt: new Date()
            }
        });
        return res.json(updated);
    }
    catch (error) {
        res.status(404).json({ error: 'Farmácia não encontrada' });
    }
});
/**
 * @route DELETE /api/admin/pharmacies/:id
 */
router.delete('/pharmacies/:id', ...adminAuth, async (req, res) => {
    try {
        await prisma_js_1.default.pharmacy.delete({ where: { id: req.params.id } });
        return res.json({ success: true });
    }
    catch (error) {
        res.status(404).json({ error: 'Farmácia não encontrada' });
    }
});
exports.default = router;
//# sourceMappingURL=pharmacies.routes.js.map