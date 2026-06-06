"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const inAppNotification_service_js_1 = __importDefault(require("../services/inAppNotification.service.js"));
const router = (0, express_1.Router)();
// Listar tickets do usuário logado (Parceiro ou Paciente)
router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const userRole = req.user.role;
        let where = {};
        if (userRole === 'PARTNER') {
            const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
            if (!partner)
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            where = { partnerId: partner.id };
        }
        else if (userRole === 'PATIENT') {
            const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
            if (!patient)
                return res.status(404).json({ error: 'Paciente não encontrado' });
            where = { patientId: patient.id };
        }
        else if (userRole === 'ADMIN') {
            // Admin vê todos
            where = {};
        }
        else {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const tickets = await prisma_js_1.default.supportTicket.findMany({
            where,
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        return res.json(tickets);
    }
    catch (error) {
        console.error('Erro ao listar tickets:', error);
        return res.status(500).json({ error: 'Erro ao listar tickets' });
    }
});
// Criar um novo ticket
router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const userRole = req.user.role;
        const { subject, category, message, priority } = req.body;
        if (!subject || !message) {
            return res.status(400).json({ error: 'Assunto e mensagem são obrigatórios' });
        }
        let ticketData = {
            subject,
            category,
            priority: priority || 'medium',
            status: 'OPEN',
            userName: req.user.name,
            userEmail: req.user.email,
        };
        if (userRole === 'PARTNER') {
            const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
            if (!partner)
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            ticketData.partnerId = partner.id;
        }
        else if (userRole === 'PATIENT') {
            const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
            if (!patient)
                return res.status(404).json({ error: 'Paciente não encontrado' });
            ticketData.patientId = patient.id;
        }
        const ticket = await prisma_js_1.default.supportTicket.create({
            data: {
                ...ticketData,
                messages: {
                    create: {
                        message,
                        sender: userRole === 'ADMIN' ? 'SUPPORT' : 'PATIENT', // Usando PATIENT como alias para o usuário final no enum/string se necessário, ou ajustando conforme schema
                    }
                }
            },
            include: {
                messages: true
            }
        });
        // Notificar Admins sobre o novo ticket
        await inAppNotification_service_js_1.default.createNotification({
            userId: null,
            type: 'support_ticket',
            title: '🎫 Novo Ticket de Suporte',
            message: `${req.user.name} abriu um ticket: ${subject}`,
            priority: priority === 'high' ? 'high' : 'medium',
            link: `/admin/suporte`
        }).catch(err => console.error('Erro ao criar notificação para admin:', err));
        return res.status(201).json(ticket);
    }
    catch (error) {
        console.error('Erro ao criar ticket:', error);
        return res.status(500).json({ error: 'Erro ao criar ticket' });
    }
});
// Detalhes de um ticket
router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role;
        const ticket = await prisma_js_1.default.supportTicket.findUnique({
            where: { id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket não encontrado' });
        // Verificar se o usuário tem permissão para ver este ticket
        if (userRole !== 'ADMIN') {
            const userId = req.user.userId || req.user.id;
            if (userRole === 'PARTNER') {
                const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
                if (!partner || ticket.partnerId !== partner.id) {
                    return res.status(403).json({ error: 'Acesso negado' });
                }
            }
            else if (userRole === 'PATIENT') {
                const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
                if (!patient || ticket.patientId !== patient.id) {
                    return res.status(403).json({ error: 'Acesso negado' });
                }
            }
            else {
                return res.status(403).json({ error: 'Acesso negado' });
            }
        }
        return res.json(ticket);
    }
    catch (error) {
        console.error('Erro ao obter ticket:', error);
        return res.status(500).json({ error: 'Erro ao obter ticket' });
    }
});
// Adicionar mensagem
router.post('/:id/messages', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const userRole = req.user.role;
        if (!message)
            return res.status(400).json({ error: 'Mensagem é obrigatória' });
        const ticket = await prisma_js_1.default.supportTicket.findUnique({ where: { id } });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket não encontrado' });
        const newMessage = await prisma_js_1.default.supportMessage.create({
            data: {
                ticketId: id,
                message,
                sender: userRole === 'ADMIN' ? 'SUPPORT' : 'PATIENT',
            }
        });
        // Atualiza o updatedAt do ticket
        await prisma_js_1.default.supportTicket.update({
            where: { id },
            data: { updatedAt: new Date() }
        });
        return res.status(201).json(newMessage);
    }
    catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});
// Fechar ou atualizar status
router.put('/:id/status', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const ticket = await prisma_js_1.default.supportTicket.update({
            where: { id },
            data: { status }
        });
        return res.json(ticket);
    }
    catch (error) {
        console.error('Erro ao atualizar status do ticket:', error);
        return res.status(500).json({ error: 'Erro ao atualizar status' });
    }
});
// Avaliar ticket resolvido
router.put('/:id/rating', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, ratingComment } = req.body;
        const ticket = await prisma_js_1.default.supportTicket.update({
            where: { id },
            data: { rating, ratingComment }
        });
        return res.json(ticket);
    }
    catch (error) {
        console.error('Erro ao avaliar ticket:', error);
        return res.status(500).json({ error: 'Erro ao avaliar ticket' });
    }
});
// Excluir ticket
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role;
        const userId = req.user.userId || req.user.id;
        const ticket = await prisma_js_1.default.supportTicket.findUnique({ where: { id } });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket não encontrado' });
        // Verificação de permissão
        if (userRole !== 'ADMIN') {
            if (userRole === 'PARTNER') {
                const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
                if (!partner || ticket.partnerId !== partner.id)
                    return res.status(403).json({ error: 'Proibido' });
            }
            else if (userRole === 'PATIENT') {
                const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
                if (!patient || ticket.patientId !== patient.id)
                    return res.status(403).json({ error: 'Proibido' });
            }
        }
        // Primeiro excluir mensagens associadas (ou usar onDelete: Cascade no prisma se configurado)
        await prisma_js_1.default.supportMessage.deleteMany({ where: { ticketId: id } });
        await prisma_js_1.default.supportTicket.delete({ where: { id } });
        return res.json({ message: 'Ticket excluído com sucesso' });
    }
    catch (error) {
        console.error('Erro ao excluir ticket:', error);
        return res.status(500).json({ error: 'Erro ao excluir ticket' });
    }
});
exports.default = router;
//# sourceMappingURL=support.routes.js.map