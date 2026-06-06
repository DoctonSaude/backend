"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyService = void 0;
// @ts-nocheck
const prisma_1 = __importDefault(require("../lib/prisma"));
class LoyaltyService {
    /**
     * Atribui pontos a um paciente e registra no histórico.
     */
    static async awardPoints(patientId, points, action, description, metadata = {}) {
        if (points <= 0)
            return;
        return await prisma_1.default.$transaction(async (tx) => {
            // 1. Garantir que o saldo não está nulo antes de incrementar
            const currentBalance = await tx.patient.findUnique({
                where: { id: patientId },
                select: { healthPoints: true, experiencePoints: true }
            });
            const initialHealthPoints = currentBalance?.healthPoints ?? 0;
            const initialXP = currentBalance?.experiencePoints ?? 0;
            // 2. Atualizar saldo do paciente
            await tx.patient.update({
                where: { id: patientId },
                data: {
                    healthPoints: initialHealthPoints + points,
                    experiencePoints: initialXP + Math.floor(points * 2)
                }
            });
            // 2. Registrar no histórico de pontos
            return await tx.pointsHistory.create({
                data: {
                    patientId,
                    points,
                    action,
                    description,
                    metadataJson: metadata
                }
            });
        });
    }
    /**
     * Calcula e atribui pontos baseados em uma transação financeira.
     */
    static async processTransactionPoints(transactionId) {
        const transaction = await prisma_1.default.transaction.findUnique({
            where: { id: transactionId },
            include: { patient: true }
        });
        if (!transaction || !transaction.patientId || transaction.status !== 'COMPLETED' || transaction.type !== 'INCOME') {
            return;
        }
        // Buscar configuração global
        const config = await prisma_1.default.loyaltyConfig.findFirst() || { pointsPerReal: 5 };
        // Buscar campanhas ativas (multiplicadores)
        const now = new Date();
        const activeCampaigns = await prisma_1.default.loyaltyCampaign.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now }
            }
        });
        // Calcular multiplicador total
        let totalMultiplier = 1.0;
        activeCampaigns.forEach(c => {
            // No caso de múltiplas campanhas, podemos somar ou multiplicar. 
            // Geralmente somar os bônus (1.0 + b1 + b2) ou pegar o maior.
            // Vamos usar o maior multiplicador ativo para simplificar.
            if (c.multiplier > totalMultiplier) {
                totalMultiplier = c.multiplier;
            }
        });
        const basePoints = Math.floor(transaction.amount * config.pointsPerReal);
        const finalPoints = Math.floor(basePoints * totalMultiplier);
        if (finalPoints > 0) {
            await this.awardPoints(transaction.patientId, finalPoints, 'FINANCIAL_TRANSACTION', `Pontos por serviço: ${transaction.description}`, {
                transactionId: transaction.id,
                multiplier: totalMultiplier,
                originalAmount: transaction.amount
            });
        }
    }
    /**
     * Atribui pontos por avaliação (Review).
     */
    static async processReviewPoints(patientId, reviewId) {
        const config = await prisma_1.default.loyaltyConfig.findFirst() || { reviewPoints: 50 };
        await this.awardPoints(patientId, config.reviewPoints, 'REVIEW_SUBMITTED', 'Avaliação de atendimento concluída', { reviewId });
    }
}
exports.LoyaltyService = LoyaltyService;
//# sourceMappingURL=loyalty.service.js.map