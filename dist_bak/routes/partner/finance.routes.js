"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const finance_service_js_1 = require("../../services/finance.service.js");
const router = (0, express_1.Router)();
/**
 * @route GET /api/partners/financial-data
 */
router.get('/financial-data', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const data = await prisma_js_1.default.partnerFinancialData.findUnique({
            where: { partnerId: partner.id }
        });
        if (!data)
            return res.status(404).json({ error: 'Dados financeiros não encontrados' });
        return res.json(data);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar dados financeiros' });
    }
});
/**
 * @route PUT /api/partners/financial-data
 */
router.put('/financial-data', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const payload = {
            ...req.body,
            partnerId: partner.id,
            taxIdType: req.body.taxIdType || (req.body.taxId?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF'),
        };
        const data = await prisma_js_1.default.partnerFinancialData.upsert({
            where: { partnerId: partner.id },
            update: payload,
            create: payload
        });
        return res.json(data);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar dados financeiros' });
    }
});
/**
 * @route GET /api/partners/payments
 * Lista os repasses (transações de crédito) do parceiro autenticado.
 */
router.get('/payments', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const { page = 1, pageSize = 20, status } = req.query;
        const skip = (Number(page) - 1) * Number(pageSize);
        const where = { partnerId: partner.id };
        if (status && status !== 'all')
            where.status = String(status).toUpperCase();
        const [total, transactions] = await prisma_js_1.default.$transaction([
            prisma_js_1.default.transaction.count({ where }),
            prisma_js_1.default.transaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(pageSize),
                include: {
                    patient: { include: { user: { select: { name: true, avatar: true } } } }
                }
            })
        ]);
        // Mapear para o formato esperado pelo frontend (useRepasses)
        const payments = transactions.map(tx => {
            let meta = {};
            try {
                meta = tx.metadata ? JSON.parse(String(tx.metadata)) : {};
            }
            catch { }
            return {
                id: tx.id,
                date: tx.createdAt.toISOString().split('T')[0],
                amount: tx.amount,
                status: tx.status === 'COMPLETED' ? 'Pago' : tx.status === 'PENDING' ? 'Pendente' : 'Processando',
                serviceType: tx.category || 'APPOINTMENT',
                description: tx.description,
                patientName: tx.patient?.user?.name || null,
                patientAvatar: tx.patient?.user?.avatar || null,
                grossAmount: meta.grossAmount || tx.amount,
                platformFee: meta.platformFee || 0,
                commissionPercent: meta.commissionPercent || 15,
                appointmentId: meta.appointmentId || null,
                type: tx.type,
                createdAt: tx.createdAt
            };
        });
        return res.json({
            data: payments,
            total,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(total / Number(pageSize))
        });
    }
    catch (error) {
        console.error('Erro ao buscar pagamentos:', error);
        return res.status(500).json({ error: 'Erro ao buscar pagamentos' });
    }
});
/**
 * @route GET /api/partners/payments/stats
 * Retorna estatísticas financeiras: saldo disponível, pendente, total recebido.
 */
router.get('/payments/stats', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const stats = await finance_service_js_1.financeService.getWalletStats(partner.id);
        // Contar agendamentos completados no mês atual
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const completedThisMonth = await prisma_js_1.default.appointment.count({
            where: {
                partnerId: partner.id,
                status: 'COMPLETED',
                dateTime: { gte: startOfMonth }
            }
        });
        return res.json({
            data: {
                balance: stats.balance,
                pendingBalance: stats.pendingBalance,
                pendingWithdrawal: stats.pendingWithdrawal,
                totalRevenue: stats.totalRevenue,
                completedAppointmentsThisMonth: completedThisMonth,
                recentTransactions: stats.transactions.slice(0, 5)
            }
        });
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return res.status(500).json({ error: 'Erro ao buscar estatísticas financeiras' });
    }
});
/**
 * @route POST /api/partners/payments/anticipation
 * Solicita antecipação de recebíveis pendentes.
 */
router.post('/payments/anticipation', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const stats = await finance_service_js_1.financeService.getWalletStats(partner.id);
        if (stats.pendingBalance <= 0) {
            return res.status(400).json({ error: 'Não há valores pendentes para antecipar' });
        }
        // Registrar a solicitação de antecipação como uma transação
        const anticipation = await prisma_js_1.default.transaction.create({
            data: {
                partnerId: partner.id,
                amount: stats.pendingBalance,
                type: 'DEBIT',
                description: 'Solicitação de Antecipação de Recebíveis',
                status: 'PENDING',
                category: 'ANTICIPATION'
            }
        });
        return res.status(201).json({
            success: true,
            message: 'Solicitação de antecipação enviada com sucesso',
            anticipation
        });
    }
    catch (error) {
        console.error('Erro ao solicitar antecipação:', error);
        return res.status(500).json({ error: 'Erro ao solicitar antecipação' });
    }
});
/**
 * @route GET /api/partners/payments/:id/receipt
 * Baixar comprovante de um repasse específico.
 */
router.get('/payments/:id/receipt', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const transaction = await prisma_js_1.default.transaction.findFirst({
            where: { id, partnerId: partner.id },
            include: { patient: { include: { user: { select: { name: true } } } } }
        });
        if (!transaction)
            return res.status(404).json({ error: 'Transação não encontrada' });
        // Retornar dados do comprovante (em produção, geraria PDF)
        return res.json({
            id: transaction.id,
            description: transaction.description,
            amount: transaction.amount,
            status: transaction.status,
            createdAt: transaction.createdAt,
            patientName: transaction.patient?.user?.name || 'N/A'
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar comprovante' });
    }
});
exports.default = router;
//# sourceMappingURL=finance.routes.js.map