"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const inAppNotification_service_js_1 = __importDefault(require("../services/inAppNotification.service.js"));
const socket_js_1 = require("../lib/socket.js");
const router = (0, express_1.Router)();
// Rota pública para pacientes solicitarem orçamentos (ou autenticada se preferir)
router.post('/request', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { partnerId, examType, urgency, contactPhone, description, imageUrl } = req.body;
        const userId = req.user?.userId;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const newQuote = await prisma_js_1.default.quote.create({
            data: {
                patientId: patient.id,
                patientName: req.user?.name || 'Paciente',
                patientPhone: contactPhone || '',
                examType,
                urgency: urgency || 'normal',
                description: description || '',
                imageUrl: imageUrl || null,
                status: 'pending',
                partnerId: partnerId || null,
                crmStatus: 'novo'
            }
        });
        // Notificar admin
        await inAppNotification_service_js_1.default.createNotification({
            userId: null,
            type: 'quote_request',
            title: 'Novo pedido de orçamento',
            message: `Novo pedido de orçamento para: ${examType}${partnerId ? ` (Parceiro: ${partnerId})` : ''}`,
            priority: 'high',
            link: `/admin/orcamentos?highlight=${newQuote.id}`
        });
        res.status(201).json({
            success: true,
            message: 'Pedido de orçamento enviado com sucesso',
            quote: newQuote
        });
    }
    catch (error) {
        console.error('Erro ao criar pedido de orçamento:', error);
        res.status(500).json({ error: 'Erro interno ao salvar orçamento' });
    }
});
// Listar orçamentos do paciente
router.get('/patient', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const patient = await prisma_js_1.default.patient.findUnique({
            where: { userId },
            include: { user: { select: { phone: true } } }
        });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        // Busca por patientId ou por telefone se for órfão
        const quotes = await prisma_js_1.default.quote.findMany({
            where: {
                OR: [
                    { patientId: patient.id },
                    {
                        AND: [
                            { patientId: null },
                            { patientPhone: patient.user?.phone || '___no_phone___' }
                        ]
                    }
                ]
            },
            include: { partner: { include: { user: { select: { name: true, avatar: true } } } } },
            orderBy: { createdAt: 'desc' }
        });
        // Auto-link orphans found by phone
        const orphans = quotes.filter(q => !q.patientId);
        if (orphans.length > 0) {
            await prisma_js_1.default.quote.updateMany({
                where: { id: { in: orphans.map(q => q.id) } },
                data: { patientId: patient.id }
            });
        }
        const mapped = quotes.map(q => {
            let response = { availableDates: [], preparationInstructions: [], observations: '' };
            try {
                // Tenta extrair dados estruturados do crmNotes
                if (q.crmNotes && q.crmNotes.trim().startsWith('{')) {
                    response = JSON.parse(q.crmNotes);
                }
            }
            catch (e) { }
            return {
                id: q.id,
                partnerName: q.partner?.user?.name || q.partner?.name || 'Consultar',
                partnerRating: q.partner?.rating || 0,
                partnerAddress: q.partner?.address || '',
                examType: q.examType,
                price: q.valorEstimado || 0,
                availableDates: response.availableDates || (q.appointmentDate ? [q.appointmentDate.toISOString()] : []),
                preparationInstructions: response.preparationInstructions || [],
                observations: response.observations || q.crmNotes || '', // Fallback se não for JSON
                status: q.status,
                validUntil: new Date(q.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: q.createdAt.toISOString(),
                partner: q.partner
            };
        });
        res.json(mapped);
    }
    catch (error) {
        console.error('Erro ao buscar orçamentos do paciente:', error);
        res.status(500).json({ error: 'Erro ao listar seus orçamentos' });
    }
});
// Listar para parceiro
router.get('/partner', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const quotes = await prisma_js_1.default.quote.findMany({
            where: { partnerId: partner.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(quotes);
    }
    catch (error) {
        console.error('Erro ao buscar orçamentos do parceiro:', error);
        res.status(500).json({ error: 'Erro ao listar orçamentos' });
    }
});
// Responder a um orçamento (Parceiro)
router.post('/:id/respond', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { price, availableDates, preparationInstructions, observations } = req.body;
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        // Verificar se o orçamento pertence ao parceiro
        const quote = await prisma_js_1.default.quote.findUnique({ where: { id } });
        if (!quote)
            return res.status(404).json({ error: 'Orçamento não encontrado' });
        if (quote.partnerId !== partner.id)
            return res.status(403).json({ error: 'Não autorizado' });
        const updatedQuote = await prisma_js_1.default.quote.update({
            where: { id },
            data: {
                status: 'responded',
                valorEstimado: price,
                crmNotes: JSON.stringify({
                    availableDates,
                    preparationInstructions,
                    observations
                }),
                crmStatus: 'negociacao'
            }
        });
        // Notificar paciente
        if (updatedQuote.patientId) {
            const patient = await prisma_js_1.default.patient.findUnique({ where: { id: updatedQuote.patientId } });
            if (patient) {
                await inAppNotification_service_js_1.default.createNotification({
                    userId: patient.userId,
                    type: 'SYSTEM',
                    title: 'Orçamento Recebido!',
                    message: `Sua solicitação de ${updatedQuote.examType} foi respondida.`,
                    priority: 'high',
                    link: '/patient/orcamentos'
                });
                // Sincronização em Tempo Real via Socket.io
                socket_js_1.SocketService.sendToUser(patient.userId, 'quoteUpdate', { quoteId: updatedQuote.id });
            }
        }
        res.json({ success: true, quote: updatedQuote });
    }
    catch (error) {
        console.error('Erro ao responder orçamento:', error);
        res.status(500).json({ error: 'Erro ao responder orçamento' });
    }
});
// Aceitar orçamento (Paciente)
router.post('/:id/accept', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { date, time, paymentMethod, couponCode } = req.body;
        const userId = req.user?.userId;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const quote = await prisma_js_1.default.quote.findUnique({
            where: { id },
            include: { partner: true }
        });
        if (!quote)
            return res.status(404).json({ error: 'Orçamento não encontrado' });
        if (quote.patientId !== patient.id)
            return res.status(403).json({ error: 'Não autorizado' });
        // Combinar data e hora
        const [year, month, day] = date.split('-');
        const [hour, minute] = time.split(':');
        const appointmentDateTime = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
        // Atualizar orçamento
        const updatedQuote = await prisma_js_1.default.quote.update({
            where: { id },
            data: {
                status: 'accepted',
                appointmentDate: appointmentDateTime,
                crmStatus: 'ganho',
                coupon: couponCode || null
            }
        });
        // Criar agendamento automático
        if (quote.partnerId) {
            await prisma_js_1.default.appointment.create({
                data: {
                    patientId: patient.id,
                    partnerId: quote.partnerId,
                    dateTime: appointmentDateTime,
                    duration: 30, // Padrão
                    status: 'CONFIRMED',
                    isOnline: false,
                    notes: `Agendado via orçamento: ${quote.examType}. ${quote.crmNotes || ''}`
                }
            });
            // Notificar parceiro
            const partnerUser = await prisma_js_1.default.partner.findUnique({
                where: { id: quote.partnerId },
                include: { user: true }
            });
            if (partnerUser?.userId) {
                await inAppNotification_service_js_1.default.createNotification({
                    userId: partnerUser.userId,
                    type: 'SYSTEM',
                    title: 'Novo Agendamento (Orçamento)',
                    message: `O paciente ${patient.userId} aceitou seu orçamento para ${quote.examType}.`,
                    priority: 'high',
                    link: '/partner/agenda'
                });
                // Sincronização em Tempo Real via Socket.io
                socket_js_1.SocketService.sendToUser(partnerUser.userId, 'quoteUpdate', { quoteId: updatedQuote.id });
                socket_js_1.SocketService.sendToUser(patient.userId, 'appointmentUpdate', { quoteId: updatedQuote.id });
            }
        }
        res.json({ success: true, quote: updatedQuote });
    }
    catch (error) {
        console.error('Erro ao aceitar orçamento:', error);
        res.status(500).json({ error: 'Erro ao aceitar orçamento' });
    }
});
// Recusar orçamento (Paciente)
router.post('/:id/reject', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user?.userId;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const quote = await prisma_js_1.default.quote.findUnique({ where: { id } });
        if (!quote)
            return res.status(404).json({ error: 'Orçamento não encontrado' });
        if (quote.patientId !== patient.id)
            return res.status(403).json({ error: 'Não autorizado' });
        const updatedQuote = await prisma_js_1.default.quote.update({
            where: { id },
            data: {
                status: 'rejected',
                crmStatus: 'perdido',
                crmMotivoPerda: reason || 'Recusado pelo paciente'
            }
        });
        res.json({ success: true, quote: updatedQuote });
    }
    catch (error) {
        console.error('Erro ao recusar orçamento:', error);
        res.status(500).json({ error: 'Erro ao recusar orçamento' });
    }
});
exports.default = router;
//# sourceMappingURL=quotes.routes.js.map