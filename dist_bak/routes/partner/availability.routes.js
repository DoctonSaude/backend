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
const socket_js_1 = require("../../lib/socket.js");
const public_routes_js_1 = require("./public.routes.js");
const router = (0, express_1.Router)();
/**
 * @route POST /api/partners/availability
 */
router.post('/availability', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { partnerId, specialty, date, time, urgency } = req.body;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const request = await prisma_js_1.default.availabilityRequest.create({
            data: {
                patientId: patient.id,
                partnerId,
                specialty,
                date,
                time,
                urgency: urgency || 'normal',
                status: 'pending'
            }
        });
        const partner = await prisma_js_1.default.partner.findUnique({ where: { id: partnerId } });
        if (partner) {
            await inAppNotification_service_js_1.default.createNotification({
                userId: partner.userId,
                type: 'system',
                title: 'Nova consulta de disponibilidade',
                message: `Você recebeu um novo pedido de disponibilidade para ${specialty}.`,
                priority: urgency === 'urgent' ? 'high' : 'medium',
                link: '/partner/disponibilidade'
            });
        }
        res.status(201).json(request);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao solicitar disponibilidade' });
    }
});
/**
 * @route GET /api/partners/availability
 */
router.get('/availability', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const role = req.user.role;
        let where = {};
        if (role === 'PARTNER') {
            const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
            if (!partner)
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            where.partnerId = partner.id;
        }
        else {
            const patient = await prisma_js_1.default.patient.findFirst({ where: { userId }, select: { id: true } });
            if (!patient)
                return res.status(404).json({ error: 'Paciente não encontrado' });
            where.patientId = patient.id;
        }
        const requests = await prisma_js_1.default.availabilityRequest.findMany({
            where,
            include: {
                patient: { include: { user: { select: { name: true, avatar: true } } } },
                partner: {
                    include: {
                        user: { select: { name: true, avatar: true } },
                        services: { where: { isActive: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests.map(r => ({
            ...r,
            partner: (0, public_routes_js_1.mapPartnerData)(r.partner)
        })));
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar disponibilidade' });
    }
});
/**
 * @route PUT /api/partners/availability/:id
 */
router.put('/availability/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, suggestedSlots } = req.body;
        const request = await prisma_js_1.default.availabilityRequest.findUnique({
            where: { id },
            include: { patient: { include: { user: true } } }
        });
        if (!request)
            return res.status(404).json({ error: 'Solicitação não encontrada' });
        const updated = await prisma_js_1.default.availabilityRequest.update({
            where: { id },
            data: {
                status,
                suggestedSlots: suggestedSlots ? JSON.stringify(suggestedSlots) : undefined
            }
        });
        if (request.patient?.user) {
            await inAppNotification_service_js_1.default.createNotification({
                userId: request.patient.user.id,
                type: 'system',
                title: 'Resposta de Disponibilidade',
                message: `O profissional respondeu sua solicitação de disponibilidade.`,
                priority: 'medium',
                link: '/patient/agendamentos?tab=requests'
            });
            socket_js_1.SocketService.sendToUser(request.patient.user.id, 'availabilityUpdate', updated);
        }
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao responder disponibilidade' });
    }
});
exports.default = router;
//# sourceMappingURL=availability.routes.js.map