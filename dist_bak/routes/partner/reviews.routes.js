"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const reputation_service_js_1 = require("../../services/reputation.service.js");
const router = (0, express_1.Router)();
/**
 * @route GET /api/partners/reviews
 */
router.get('/reviews', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const reviews = await prisma_js_1.default.review.findMany({
            where: { partnerId: partner.id },
            include: {
                appointment: { include: { patient: { include: { user: { select: { name: true, avatar: true } } } } } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(reviews.map(r => ({
            id: r.id,
            patientName: r.appointment.patient.user.name,
            avatar: r.appointment.patient.user.avatar,
            rating: r.rating,
            comment: r.comment,
            date: r.createdAt.toISOString(),
            reply: r.reply,
            replyDate: r.replyDate
        })));
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao listar avaliações' });
    }
});
/**
 * @route GET /api/partners/reputation/stats
 */
router.get('/reputation/stats', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const stats = await reputation_service_js_1.reputationService.getReputationStats(partner.id);
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * @route POST /api/partners/reputation/reviews/:reviewId/reply
 */
router.post('/reputation/reviews/:reviewId/reply', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { reply } = req.body;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const updatedReview = await reputation_service_js_1.reputationService.replyToReview(req.params.reviewId, partner.id, reply);
        res.json(updatedReview);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=reviews.routes.js.map