"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeService = exports.FinanceService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const date_fns_1 = require("date-fns");
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
     * Nota: Campos financeiros removidos do modelo Appointment no schema atual.
     * Apenas registramos o fato na tabela Transaction.
     */
    async processAppointmentCompletion(appointmentId) {
        const appointment = await prisma_js_1.default.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: { include: { user: { select: { name: true } } } }
            }
        });
        if (!appointment || !appointment.partnerId) {
            throw new Error('Agendamento ou Parceiro não encontrado');
        }
        // Preço base fixo/calculado (ajuste conforme necessidade do negócio)
        const basePrice = 100;
        const fees = await this.calculateFees(basePrice, appointment.partnerId);
        // Janela de liquidação padrão (30 dias)
        const daysToClear = 30;
        const availableAt = (0, date_fns_1.addDays)(new Date(), daysToClear);
        // 1. Atualizar Status do Agendamento apenas
        await prisma_js_1.default.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'COMPLETED'
            }
        });
        // 2. Criar Transação usando o modelo que existe no schema
        await prisma_js_1.default.transaction.create({
            data: {
                partnerId: appointment.partnerId,
                patientId: appointment.patientId,
                type: 'CREDIT',
                amount: fees.partnerNetPrice,
                description: `Atendimento: ${appointment.patient.user?.name || 'Paciente'}`,
                status: 'PENDING',
                category: 'APPOINTMENT'
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
        const totalGrossRevenue = await prisma_js_1.default.transaction.aggregate({
            where: { partnerId, type: 'CREDIT', status: 'COMPLETED' },
            _sum: { amount: true }
        });
        return {
            balance: 0,
            pendingBalance: 0,
            totalRevenue: totalGrossRevenue._sum.amount || 0,
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
}
exports.FinanceService = FinanceService;
exports.financeService = new FinanceService();
//# sourceMappingURL=finance.service.js.map