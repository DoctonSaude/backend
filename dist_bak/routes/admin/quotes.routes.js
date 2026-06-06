"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const inAppNotification_service_js_1 = require("../../services/inAppNotification.service.js");
const router = (0, express_1.Router)();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN')];
/**
 * @route GET /api/admin/quotes
 */
router.get('/quotes', ...adminAuth, async (req, res) => {
    try {
        const quotes = await prisma_js_1.default.quote.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                patient: { select: { user: { select: { name: true, phone: true } } } }
            }
        });
        const mapped = quotes.map(q => ({
            id: q.id,
            displayId: q.displayId || 0,
            patientName: q.patientName,
            patientPhone: q.patientPhone,
            examType: q.examType,
            urgency: q.urgency,
            description: q.description || '',
            status: q.status,
            createdAt: q.createdAt.toISOString(),
            partnerId: q.partnerId || undefined,
            valorEstimado: q.estimatedValue ?? undefined,
            crm: {
                statusInterno: q.crmStatus,
                proximoContato: q.crmNextContact?.toISOString().split('T')[0] || undefined,
                notas: q.crmNotes || undefined,
                responsavel: q.crmAssignee || undefined,
                motivoPerda: q.crmLossReason || undefined
            }
        }));
        res.json(mapped);
    }
    catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Erro ao listar orçamentos' });
    }
});
/**
 * @route PATCH /api/admin/quotes/:id
 */
router.patch('/quotes/:id', ...adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body || {};
        const updated = await prisma_js_1.default.quote.update({
            where: { id },
            data: {
                patientName: body.patientName ?? undefined,
                patientPhone: body.patientPhone ?? undefined,
                examType: body.examType ?? undefined,
                urgency: body.urgency ?? undefined,
                description: body.description ?? undefined,
                status: body.status ?? undefined,
                valorEstimado: body.valorEstimado !== undefined ? Number(body.valorEstimado) : undefined,
                discount: body.discount !== undefined ? Number(body.discount) : undefined,
                coupon: body.coupon ?? undefined
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(404).json({ error: 'Orçamento não encontrado' });
    }
});
/**
 * @route PATCH /api/admin/quotes/:id/crm
 */
router.patch('/quotes/:id/crm', ...adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { statusInterno, proximoContato, notas, responsavel, motivoPerda } = req.body;
        let newStatus = undefined;
        if (statusInterno === 'fechado_ganho')
            newStatus = 'accepted';
        else if (statusInterno === 'fechado_perdido')
            newStatus = 'rejected';
        else if (statusInterno)
            newStatus = 'responded';
        const updated = await prisma_js_1.default.quote.update({
            where: { id },
            data: {
                crmStatus: statusInterno,
                crmNextContact: proximoContato ? new Date(proximoContato) : undefined,
                crmNotes: notas,
                crmResponsavel: responsavel,
                crmMotivoPerda: motivoPerda,
                status: newStatus,
                updatedAt: new Date()
            }
        });
        res.json({
            ...updated,
            crm: {
                statusInterno: updated.crmStatus,
                proximoContato: updated.crmNextContact,
                notas: updated.crmNotes,
                responsavel: updated.crmResponsavel,
                motivoPerda: updated.crmMotivoPerda
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar CRM' });
    }
});
/**
 * @route POST /api/admin/quotes/:id/respond
 */
router.post('/quotes/:id/respond', ...adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body || {};
        const quote = await prisma_js_1.default.quote.findUnique({ where: { id } });
        if (!quote)
            return res.status(404).json({ error: 'Orçamento não encontrado' });
        const updated = await prisma_js_1.default.quote.update({
            where: { id },
            data: {
                status: 'responded',
                crmStatus: 'aguardando_resposta',
                valorEstimado: Number(body.price) || undefined,
                discount: Number(body.discount) || 0,
                coupon: body.coupon || null,
                partnerId: body.partnerId || null,
                appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : undefined,
                updatedAt: new Date()
            }
        });
        // Notify patient
        if (updated.patientId || updated.patientPhone) {
            const patient = await prisma_js_1.default.patient.findFirst({
                where: { OR: [{ id: updated.patientId || '' }, { user: { phone: updated.patientPhone || '' } }] }
            });
            if (patient) {
                await inAppNotification_service_js_1.inAppNotificationService.createNotification({
                    userId: patient.userId,
                    type: 'quote_response',
                    title: '✅ Orçamento Respondido!',
                    message: `Seu orçamento para ${updated.examType} foi respondido. Valor: R$ ${Number(body.price).toFixed(2)}`,
                    link: '/patient/orcamentos',
                    priority: 'high'
                }).catch(() => { });
            }
        }
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao responder orçamento' });
    }
});
/**
 * @route DELETE /api/admin/quotes/:id
 */
router.delete('/quotes/:id', ...adminAuth, async (req, res) => {
    try {
        await prisma_js_1.default.quote.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(404).json({ error: 'Orçamento não encontrado' });
    }
});
exports.default = router;
//# sourceMappingURL=quotes.routes.js.map