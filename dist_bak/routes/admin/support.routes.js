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
 * @route GET /api/admin/support/tickets
 */
router.get('/support/tickets', ...adminAuth, async (req, res) => {
    try {
        const { status, priority } = req.query;
        const where = {};
        if (status && status !== 'all')
            where.status = status;
        if (priority)
            where.priority = priority;
        const tickets = await prisma_js_1.default.supportTicket.findMany({
            where,
            include: {
                patient: { select: { user: { select: { name: true, email: true } } } }
            },
            orderBy: { updatedAt: 'desc' }
        });
        const formatted = tickets.map(t => ({
            ...t,
            userName: t.userName || t.patient?.user?.name || 'Usuário Desconhecido',
            userEmail: t.userEmail || t.patient?.user?.email || '',
        }));
        return res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar tickets' });
    }
});
/**
 * @route GET /api/admin/support/tickets/:id
 */
router.get('/support/tickets/:id', ...adminAuth, async (req, res) => {
    try {
        const ticket = await prisma_js_1.default.supportTicket.findUnique({
            where: { id: req.params.id },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
                patient: { select: { user: { select: { name: true, email: true, phone: true } } } }
            }
        });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket não encontrado' });
        const formatted = {
            ...ticket,
            userName: ticket.userName || ticket.patient?.user?.name || 'Usuário Desconhecido',
            userEmail: ticket.userEmail || ticket.patient?.user?.email || '',
        };
        return res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar ticket' });
    }
});
/**
 * @route POST /api/admin/support/tickets/:id/resolve
 */
router.post('/support/tickets/:id/resolve', ...adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution } = req.body;
        const updated = await prisma_js_1.default.supportTicket.update({
            where: { id },
            data: {
                status: 'RESOLVED',
                updatedAt: new Date(),
                messages: {
                    create: {
                        sender: 'SUPPORT',
                        message: `Ticket resolvido: ${resolution || 'Questão solucionada pelo suporte.'}`,
                        createdAt: new Date()
                    }
                }
            }
        });
        return res.json(updated);
    }
    catch (error) {
        res.status(404).json({ error: 'Ticket não encontrado' });
    }
});
// --- Knowledge Base ---
/**
 * @route GET /api/admin/support/knowledge-base
 */
router.get('/support/knowledge-base', ...adminAuth, async (req, res) => {
    try {
        const articles = await prisma_js_1.default.knowledgeBaseArticle.findMany({
            include: { category: true },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(articles);
    }
    catch (error) {
        res.json([]);
    }
});
exports.default = router;
//# sourceMappingURL=support.routes.js.map