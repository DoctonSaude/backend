"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const notification_service_js_1 = __importDefault(require("../../services/notification.service.js"));
const router = (0, express_1.Router)();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN')];
/**
 * @route GET /api/admin/challenges
 */
router.get('/challenges', ...adminAuth, async (req, res) => {
    try {
        const list = await prisma_js_1.default.challenge.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(list);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar desafios' });
    }
});
/**
 * @route POST /api/admin/challenges
 */
router.post('/challenges', ...adminAuth, async (req, res) => {
    try {
        const b = req.body;
        const created = await prisma_js_1.default.challenge.create({
            data: {
                title: b.title,
                description: b.description,
                type: b.type || 'DAILY',
                points: b.points || 0,
                category: b.category || 'Geral',
                status: b.status || 'Ativo',
                isActive: b.status === 'Ativo',
                sponsor: b.sponsor || 'Docton',
                startDate: b.startDate ? new Date(b.startDate) : null,
                endDate: b.endDate ? new Date(b.endDate) : null,
                approvalStatus: 'approved',
                createdBy: 'Admin'
            }
        });
        if (created.status === 'Ativo') {
            // Notificação básica (exemplo)
            notification_service_js_1.default.sendBulkPushNotifications(['*'], { title: 'Novo Desafio!', body: created.title }).catch(() => { });
        }
        res.status(201).json(created);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar desafio' });
    }
});
exports.default = router;
//# sourceMappingURL=challenges.routes.js.map