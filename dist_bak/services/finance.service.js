"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeService = exports.FinanceService = void 0;
// @ts-nocheck
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
class FinanceService {
    /**
     * Calcula as taxas e o valor líquido do parceiro.
     * Padrão 15% de taxa de plataforma.
     */
    async calculateFees(amount, partnerId) {
        let commissionPercent = 15;
        // Buscar se há taxa customizada configurada nos dados financeiros
        const financialData = await prisma_js_1.default.partnerFinancialData.findUnique({
            where: { partnerId }
        });
        if (financialData && financialData.platformFeePercentage !== undefined) {
            commissionPercent = financialData.platformFeePercentage;
        }
        const doctonFee = (amount * commissionPercent) / 100;
        const partnerNetPrice = amount - doctonFee;
        return {
            commissionPercent,
            doctonFee,
            partnerNetPrice
        };
    }
    /**
     * Registra a conclusão de um agendamento e atualiza o financeiro do parceiro.
     * Usa o preço real da consulta configurado no perfil do parceiro.
     */
    async processAppointmentCompletion(appointmentId) {
        const appointment = await prisma_js_1.default.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: { include: { user: { select: { name: true } } } },
                partner: { select: { consultationPrice: true } }
            }
        });
        if (!appointment || !appointment.partnerId) {
            throw new Error('Agendamento ou Parceiro não encontrado');
        }
        // Usar o preço real da consulta configurado no perfil do parceiro
        // Com fallback para R$100 caso não esteja configurado
        const basePrice = appointment.partner?.consultationPrice
            ? Number(appointment.partner.consultationPrice)
            : 100;
        const fees = await this.calculateFees(basePrice, appointment.partnerId);
        // Criar Transação de CRÉDITO para o parceiro (repasse a receber)
        await prisma_js_1.default.transaction.create({
            data: {
                partnerId: appointment.partnerId,
                patientId: appointment.patientId,
                type: 'CREDIT',
                amount: fees.partnerNetPrice,
                description: `Repasse - Atendimento: ${appointment.patient.user?.name || 'Paciente'}`,
                status: 'PENDING',
                category: 'APPOINTMENT',
                metadata: JSON.stringify({
                    grossAmount: basePrice,
                    platformFee: fees.doctonFee,
                    commissionPercent: fees.commissionPercent,
                    appointmentId: appointment.id
                })
            }
        });
        return fees;
    }
    /**
     * Retorna estatísticas financeiras usando o modelo Transaction.
     */
    async getWalletStats(partnerId) {
        const transactions = await prisma_js_1.default.transaction.findMany({
            where: { partnerId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        // Saldo disponível = soma de CREDITS com status COMPLETED
        const completedCredit = await prisma_js_1.default.transaction.aggregate({
            where: { partnerId, type: 'CREDIT', status: 'COMPLETED' },
            _sum: { amount: true }
        });
        // Saques já realizados = soma de DEBITS com status COMPLETED
        const completedDebit = await prisma_js_1.default.transaction.aggregate({
            where: { partnerId, type: 'DEBIT', status: 'COMPLETED' },
            _sum: { amount: true }
        });
        // Saldo pendente = CREDITS com status PENDING (aguardando liberação)
        const pendingCredit = await prisma_js_1.default.transaction.aggregate({
            where: { partnerId, type: 'CREDIT', status: 'PENDING' },
            _sum: { amount: true }
        });
        // Saques pendentes
        const pendingDebit = await prisma_js_1.default.transaction.aggregate({
            where: { partnerId, type: 'DEBIT', status: 'PENDING' },
            _sum: { amount: true }
        });
        const totalReceived = completedCredit._sum.amount || 0;
        const totalWithdrawn = completedDebit._sum.amount || 0;
        const balance = totalReceived - totalWithdrawn;
        const pendingBalance = pendingCredit._sum.amount || 0;
        const pendingWithdrawal = pendingDebit._sum.amount || 0;
        return {
            balance: Math.max(0, balance),
            pendingBalance,
            pendingWithdrawal,
            totalRevenue: totalReceived,
            transactions
        };
    }
    /**
     * Solicita um saque do saldo disponível.
     */
    async requestPayout(partnerId, amount) {
        const request = await prisma_js_1.default.transaction.create({
            data: {
                partnerId,
                amount,
                type: 'DEBIT',
                description: 'Solicitação de Saque',
                status: 'PENDING',
                category: 'WITHDRAWAL'
            }
        });
        return request;
    }
    /**
     * Processa a liquidação de repasses pendentes (D+30).
     * Transforma créditos PENDING em COMPLETED após a janela de segurança.
     */
    async processLiquidations() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const pendingCredits = await prisma_js_1.default.transaction.findMany({
            where: {
                type: 'CREDIT',
                status: 'PENDING',
                createdAt: { lt: thirtyDaysAgo }
            }
        });
        if (pendingCredits.length === 0)
            return 0;
        const result = await prisma_js_1.default.transaction.updateMany({
            where: {
                id: { in: pendingCredits.map(tx => tx.id) }
            },
            data: {
                status: 'COMPLETED',
                paymentDate: new Date()
            }
        });
        return result.count;
    }
}
exports.FinanceService = FinanceService;
exports.financeService = new FinanceService();
//# sourceMappingURL=finance.service.js.map