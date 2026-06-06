"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const inAppNotification_service_1 = __importDefault(require("../services/inAppNotification.service"));
const router = (0, express_1.Router)();
const SubscriptionSchema = zod_1.z.object({
    medicationName: zod_1.z.string().min(1),
    dosage: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().positive().default(1),
    frequencyDays: zod_1.z.number().int().positive().default(30),
    pharmacyId: zod_1.z.string().cuid(),
    paymentMethod: zod_1.z.string().optional()
});
// 1. Listar assinaturas do paciente logado
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const patient = await prisma_1.default.patient.findUnique({
            where: { userId },
            select: { id: true }
        });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const subscriptions = await prisma_1.default.medicationSubscription.findMany({
            where: { patientId: patient.id },
            include: { pharmacy: { select: { name: true, phone: true } } },
            orderBy: { nextRefillDate: 'asc' },
            take: 50
        });
        res.json(subscriptions);
    }
    catch (error) {
        console.error('[Subscriptions GET Error]', error);
        res.status(500).json({ error: 'Erro ao buscar assinaturas' });
    }
});
// 2. Criar nova assinatura de medicamento
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { medicationName, dosage, quantity, frequencyDays, pharmacyId, paymentMethod } = SubscriptionSchema.parse(req.body);
        const userId = req.user.userId;
        const patient = await prisma_1.default.patient.findUnique({
            where: { userId },
            select: { id: true, userId: true }
        });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        // Calcular data do primeiro reabastecimento (hoje + frequência)
        const nextRefillDate = new Date();
        nextRefillDate.setDate(nextRefillDate.getDate() + (frequencyDays || 30));
        const subscription = await prisma_1.default.medicationSubscription.create({
            data: {
                patientId: patient.id,
                pharmacyId,
                medicationName,
                dosage,
                quantity,
                frequencyDays,
                nextRefillDate,
                status: 'ACTIVE',
                discountPercent: 10.0, // Desconto padrão da plataforma para assinantes
                paymentMethod
            }
        });
        // Notificar Admin sobre a nova assinatura
        await inAppNotification_service_1.default.createNotification({
            userId: null,
            type: 'system',
            title: '💊 Nova Assinatura de Medicamento',
            message: `O paciente ${patient.userId} criou uma assinatura para ${medicationName}.`,
            priority: 'medium',
            link: '/admin/medicamentos'
        }).catch(err => console.error('Erro ao notificar admin sobre nova assinatura:', err));
        res.status(201).json(subscription);
    }
    catch (error) {
        console.error('[Subscriptions POST Error]', error);
        res.status(500).json({ error: 'Erro ao criar assinatura' });
    }
});
// 3. Gerenciar status da assinatura (Pausar/Cancelar/Ativar)
router.patch('/:id', auth_1.authenticate, (0, auth_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, frequencyDays } = req.body;
        const userId = req.user.userId;
        const patient = await prisma_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const subscription = await prisma_1.default.medicationSubscription.findFirst({
            where: { id, patientId: patient.id }
        });
        if (!subscription)
            return res.status(404).json({ error: 'Assinatura não encontrada' });
        const updated = await prisma_1.default.medicationSubscription.update({
            where: { id },
            data: {
                status: status || undefined,
                frequencyDays: frequencyDays || undefined
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('[Subscriptions PATCH Error]', error);
        res.status(500).json({ error: 'Erro ao atualizar assinatura' });
    }
});
// 4. Estatísticas de Economia do Assinante
router.get('/stats', auth_1.authenticate, (0, auth_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const patient = await prisma_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const subscriptions = await prisma_1.default.medicationSubscription.findMany({
            where: { patientId: patient.id }
        });
        // Lógica simples de economia (Pode ser refinada no futuro com preços reais)
        const totalRefills = subscriptions.reduce((acc, s) => acc + s.totalRefills, 0);
        const estimatedSavings = subscriptions.reduce((acc, s) => acc + (s.totalRefills * 15.50), 0); // Ex: R$ 15,50 de economia média por ciclo
        res.json({
            activeSubscriptions: subscriptions.filter(s => s.status === 'ACTIVE').length,
            totalRefills,
            estimatedSavings,
            memberSince: patient.createdAt
        });
    }
    catch (error) {
        console.error('[Subscriptions Stats Error]', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});
exports.default = router;
//# sourceMappingURL=subscription.routes.js.map