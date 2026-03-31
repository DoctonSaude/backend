"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const socket_js_1 = require("../lib/socket.js");
const router = (0, express_1.Router)();
/**
 * Listar conversas do usuário logado
 */
router.get('/conversations', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const conversations = await prisma_js_1.default.chatConversation.findMany({
            where: {
                OR: [
                    { patientUserId: userId },
                    { pharmacyUserId: userId }
                ]
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                patient: { include: { user: { select: { name: true, avatar: true } } } },
                pharmacy: { include: { user: { select: { name: true, avatar: true } } } }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(conversations);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar conversas' });
    }
});
/**
 * Buscar mensagens de uma conversa
 */
router.get('/conversations/:id/messages', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const messages = await prisma_js_1.default.chatMessage.findMany({
            where: { conversationId: id },
            orderBy: { createdAt: 'asc' }
        });
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});
/**
 * Enviar mensagem
 */
router.post('/conversations/:id/messages', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const senderId = req.user?.userId;
        const conversation = await prisma_js_1.default.chatConversation.findUnique({
            where: { id }
        });
        if (!conversation)
            return res.status(404).json({ error: 'Conversa não encontrada' });
        const message = await prisma_js_1.default.chatMessage.create({
            data: {
                conversationId: id,
                senderId,
                content
            }
        });
        await prisma_js_1.default.chatConversation.update({
            where: { id },
            data: { updatedAt: new Date() }
        });
        // Notificar via Socket
        const recipientId = conversation.patientUserId === senderId
            ? conversation.pharmacyUserId
            : conversation.patientUserId;
        socket_js_1.SocketService.sendToUser(recipientId, 'new_message', {
            conversationId: id,
            message
        });
        res.status(201).json(message);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});
exports.default = router;
//# sourceMappingURL=chat.routes.js.map