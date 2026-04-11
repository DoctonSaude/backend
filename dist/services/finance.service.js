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
     * Prioridade: Taxa customizada nos Dados Financeiros > Plano (PREMIUM 5%, PRO 10%, FREE 15%)
     */
    async calculateFees(amount, partnerId, planTier = 'FREE') {
        let commissionPercent = 15;
        // Buscar se há taxa customizada configurada nos dados financeiros
        const financialData = await prisma_js_1.default.partnerFinancialData.findUnique({
            where: { partnerId }
        });
        if (financialData && financialData.platformFeePercentage !== undefined) {
            commissionPercent = financialData.platformFeePercentage;
        }
        else {
            if (planTier === 'PRO')
                commissionPercent = 10;
            if (planTier === 'PREMIUM')
                commissionPercent = 5;
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
     * Agora busca o preço dinamicamente do serviço vinculado.
     */
    async processAppointmentCompletion(appointmentId) {
        const appointment = await prisma_js_1.default.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                partner: true,
                patient: { include: { user: true } },
                service: true
            }
        });
        if (!appointment || !appointment.partnerId || !appointment.partner) {
            throw new Error('Agendamento ou Parceiro não encontrado');
        }
        // 1. Obter o preço base dinamicamente
        let basePrice = 0;
        if (appointment.serviceId && appointment.service) {
            basePrice = appointment.service.price;
        }
        else {
            // Fallback para notas estruturadas (Retrocompatibilidade)
            const notesPriceMatch = appointment.notes?.match(/Valor:\s*(\d+(\.\d+)?)/);
            if (notesPriceMatch) {
                basePrice = parseFloat(notesPriceMatch[1]);
            }
            else {
                // Fallback final: preço padrão do parceiro ou valor fixo
                basePrice = appointment.partner.consultationPrice || 100;
            }
        }
        // Se o preço for zero (ex: retorno ou cortesia), não gera transação financeira
        if (basePrice <= 0)
            return null;
        const fees = await this.calculateFees(basePrice, appointment.partnerId, appointment.partner.planTier);
        // 2. Determinar janela de liquidação com base no plano
        let daysToClear = 30;
        const tier = appointment.partner.planTier;
        if (tier === 'STARTER' || tier === 'BASIC')
            daysToClear = 15;
        if (tier === 'PRO')
            daysToClear = 7;
        if (tier === 'PREMIUM')
            daysToClear = 1;
        const availableAt = (0, date_fns_1.addDays)(new Date(), daysToClear);
        // 3. Atualizar Agendamento com os valores calculados
        await prisma_js_1.default.appointment.update({
            where: { id: appointmentId },
            data: {
                doctonFee: fees.doctonFee,
                partnerNetPrice: fees.partnerNetPrice,
                commissionPercent: fees.commissionPercent,
                availableAt,
                payoutStatus: 'PENDING'
            }
        });
        // 4. Criar Transação na Carteira
        const serviceName = appointment.service?.name || appointment.notes?.split('\n')[0] || 'Atendimento';
        await prisma_js_1.default.partnerTransaction.create({
            data: {
                partnerId: appointment.partnerId,
                appointmentId: appointment.id,
                type: 'CREDIT',
                amount: fees.partnerNetPrice,
                description: `${serviceName}: ${appointment.patient.user?.name || 'Paciente'}`,
                status: 'PENDING',
                availableAt
            }
        });
        // 5. Atualizar Saldo Pendente na Carteira
        await prisma_js_1.default.partnerWallet.upsert({
            where: { partnerId: appointment.partnerId },
            create: {
                partnerId: appointment.partnerId,
                pendingBalance: fees.partnerNetPrice,
                balance: 0
            },
            update: {
                pendingBalance: { increment: fees.partnerNetPrice }
            }
        });
        return fees;
    }
    /**
     * Retorna estatísticas financeiras detalhadas para o dashboard do parceiro.
     */
    async getWalletStats(partnerId) {
        const wallet = await prisma_js_1.default.partnerWallet.findUnique({
            where: { partnerId }
        });
        const transactions = await prisma_js_1.default.partnerTransaction.findMany({
            where: { partnerId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        const totalGrossRevenue = await prisma_js_1.default.partnerTransaction.aggregate({
            where: { partnerId, type: 'CREDIT' },
            _sum: { amount: true }
        });
        return {
            balance: wallet?.balance || 0,
            pendingBalance: wallet?.pendingBalance || 0,
            totalRevenue: totalGrossRevenue._sum.amount || 0,
            transactions
        };
    }
    /**
     * Solicita um saque do saldo disponível.
     */
    async requestPayout(partnerId, amount, bankDetails) {
        const wallet = await prisma_js_1.default.partnerWallet.findUnique({
            where: { partnerId }
        });
        if (!wallet || wallet.balance < amount) {
            throw new Error('Saldo insuficiente para o saque solicitado.');
        }
        // 1. Criar pedido de saque
        const request = await prisma_js_1.default.payoutRequest.create({
            data: {
                partnerId,
                amount,
                status: 'PENDING',
                bankDetails
            }
        });
        // 2. Deduzir do saldo disponível (bloquear)
        await prisma_js_1.default.partnerWallet.update({
            where: { partnerId },
            data: {
                balance: { decrement: amount }
            }
        });
        // 3. Criar transação de débito
        await prisma_js_1.default.partnerTransaction.create({
            data: {
                partnerId,
                type: 'DEBIT',
                amount: amount,
                description: 'Solicitação de Saque',
                status: 'COMPLETED'
            }
        });
        return request;
    }
}
exports.FinanceService = FinanceService;
exports.financeService = new FinanceService();
//# sourceMappingURL=finance.service.js.map