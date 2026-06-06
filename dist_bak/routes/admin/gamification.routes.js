"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const multer_1 = __importDefault(require("multer"));
const storage_service_js_1 = require("../../services/storage.service.js");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN')];
// --- Rewards ---
/**
 * @route GET /api/admin/rewards
 */
router.get('/rewards', ...adminAuth, async (req, res) => {
    try {
        const list = await prisma_js_1.default.reward.findMany({ orderBy: { createdAt: 'desc' } });
        const mapped = list.map(r => ({
            ...r,
            status: r.status || (r.isActive ? 'Ativo' : 'Inativo'),
        }));
        return res.json(mapped);
    }
    catch (error) {
        res.json([]);
    }
});
/**
 * @route POST /api/admin/rewards
 */
router.post('/rewards', ...adminAuth, async (req, res) => {
    const b = req.body || {};
    try {
        const created = await prisma_js_1.default.reward.create({
            data: {
                name: String(b.name || 'Recompensa'),
                description: String(b.description || ''),
                pointsCost: Number(b.pointsCost || 0),
                category: String(b.category || 'Geral'),
                isActive: b.status === 'Ativo' || b.active !== false,
                status: b.status || (b.active !== false ? 'Ativo' : 'Inativo'),
                stockQuantity: typeof b.stockQuantity === 'number' ? b.stockQuantity : null,
                icon: b.icon || 'Gift',
                discountPercent: b.discountPercent ? Number(b.discountPercent) : null,
                partnerInfo: b.partnerInfo || null,
            }
        });
        return res.status(201).json(created);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar recompensa' });
    }
});
/**
 * @route PUT /api/admin/rewards/:id
 */
router.put('/rewards/:id', ...adminAuth, async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
        const updated = await prisma_js_1.default.reward.update({
            where: { id },
            data: {
                name: b.name,
                description: b.description,
                pointsCost: b.pointsCost !== undefined ? Number(b.pointsCost) : undefined,
                category: b.category,
                isActive: b.status ? b.status === 'Ativo' : undefined,
                status: b.status,
                stockQuantity: b.stockQuantity !== undefined ? Number(b.stockQuantity) : undefined,
                updatedAt: new Date()
            }
        });
        return res.json(updated);
    }
    catch (error) {
        res.status(404).json({ error: 'Recompensa não encontrada' });
    }
});
/**
 * @route POST /api/admin/rewards/:id/image
 */
router.post('/rewards/:id/image', ...adminAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        const publicUrl = await storage_service_js_1.storageService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'rewards');
        const updated = await prisma_js_1.default.reward.update({
            where: { id: req.params.id },
            data: { imageUrl: publicUrl, updatedAt: new Date() }
        });
        return res.json({ url: publicUrl, reward: updated });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro no upload da imagem' });
    }
});
// --- Loyalty Tiers ---
/**
 * @route GET /api/admin/loyalty/tiers
 */
router.get('/loyalty/tiers', ...adminAuth, async (req, res) => {
    try {
        const tiers = [
            { id: '1', name: 'Bronze', minXP: 0, multiplier: 1.0, color: '#CD7F32' },
            { id: '2', name: 'Prata', minXP: 1000, multiplier: 1.1, color: '#C0C0C0' },
            { id: '3', name: 'Ouro', minXP: 5000, multiplier: 1.25, color: '#FFD700' },
            { id: '4', name: 'Diamante', minXP: 15000, multiplier: 1.5, color: '#B9F2FF' }
        ];
        return res.json(tiers);
    }
    catch (error) {
        res.json([]);
    }
});
exports.default = router;
//# sourceMappingURL=gamification.routes.js.map