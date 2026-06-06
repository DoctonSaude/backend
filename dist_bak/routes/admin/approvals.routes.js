"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const inAppNotification_service_js_1 = __importDefault(require("../../services/inAppNotification.service.js"));
const router = (0, express_1.Router)();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN')];
/**
 * @route GET /api/admin/approvals/pending
 */
router.get('/approvals/pending', ...adminAuth, async (req, res) => {
    try {
        const [pendingPartners, pendingPharmacies] = await Promise.all([
            prisma_js_1.default.partner.findMany({
                where: { isApproved: false },
                include: { user: true, documents: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_js_1.default.pharmacy.findMany({
                where: { isApproved: false },
                include: { users: true },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const mappedPartners = pendingPartners.map((p) => ({
            id: p.id,
            type: 'PARTNER',
            name: p.user?.name || p.name || 'Parceiro',
            cnpj: p.cnpj || 'Sob consulta',
            contactEmail: p.user?.email || '',
            requestDate: p.createdAt.toISOString(),
            documents: p.documents.map(d => ({ id: d.id, type: d.type, name: d.name, url: d.url }))
        }));
        const mappedPharmacies = pendingPharmacies.map((p) => ({
            id: p.id,
            type: 'PHARMACY',
            name: p.name || 'Farmácia',
            cnpj: p.cnpj || 'Não informado',
            contactEmail: p.users?.[0]?.email || '',
            requestDate: p.createdAt.toISOString(),
        }));
        res.json([...mappedPartners, ...mappedPharmacies].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar pendências' });
    }
});
/**
 * @route PUT /api/admin/partners/:id/approve
 */
router.put('/partners/:id/approve', ...adminAuth, async (req, res) => {
    try {
        const updated = await prisma_js_1.default.partner.update({
            where: { id: req.params.id },
            data: { isApproved: true, updatedAt: new Date() },
        });
        await inAppNotification_service_js_1.default.createNotification({
            userId: updated.userId,
            type: 'system',
            title: '✅ Cadastro Aprovado!',
            message: 'Seu cadastro foi aprovado. Bem-vindo!',
            priority: 'high',
            link: '/partner/dashboard'
        }).catch(() => { });
        res.json({ message: 'Parceiro aprovado', partner: updated });
    }
    catch (err) {
        res.status(404).json({ error: 'Parceiro não encontrado' });
    }
});
/**
 * @route PUT /api/admin/pharmacies/:id/approve
 */
router.put('/pharmacies/:id/approve', ...adminAuth, async (req, res) => {
    try {
        const updated = await prisma_js_1.default.pharmacy.update({
            where: { id: req.params.id },
            data: { isApproved: true },
            include: { users: true }
        });
        for (const user of updated.users) {
            await inAppNotification_service_js_1.default.createNotification({
                userId: user.id,
                type: 'system',
                title: '✅ Cadastro Aprovado!',
                message: 'O cadastro da sua farmácia foi aprovado.',
                priority: 'high',
                link: '/pharmacy/dashboard'
            }).catch(() => { });
        }
        res.json({ message: 'Farmácia aprovada', pharmacy: updated });
    }
    catch (err) {
        res.status(404).json({ error: 'Farmácia não encontrada' });
    }
});
exports.default = router;
//# sourceMappingURL=approvals.routes.js.map