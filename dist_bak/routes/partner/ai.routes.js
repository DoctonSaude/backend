"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const chatbot_service_js_1 = require("../../services/chatbot.service.js");
const router = (0, express_1.Router)();
/**
 * @route GET /api/partners/ai/history
 */
router.get('/ai/history', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const history = await prisma_js_1.default.chatHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return res.json(history);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar histórico IA' });
    }
});
/**
 * @route POST /api/partners/ai/chat
 */
router.post('/ai/chat', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.userId || req.user.id;
        if (!message)
            return res.status(400).json({ error: 'Mensagem é obrigatória' });
        const response = await chatbot_service_js_1.ChatbotService.processPartnerQuery(message, userId);
        return res.json(response);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao processar IA' });
    }
});
/**
 * @route GET /api/partners/ai/insights
 */
router.get('/ai/insights', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const insights = await prisma_js_1.default.aiInsight.findMany({
            where: { OR: [{ userId }, { userId: null }] },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(insights);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar insights' });
    }
});
exports.default = router;
//# sourceMappingURL=ai.routes.js.map