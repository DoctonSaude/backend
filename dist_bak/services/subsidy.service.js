"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subsidyService = exports.SubsidyService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const logger_js_1 = require("../lib/logger.js");
class SubsidyService {
    /**
     * Calcula o subsídio para um paciente em um determinado valor de compra
     */
    async calculateSubsidy(userId, totalAmount) {
        try {
            // 1. Buscar o vínculo de funcionário do usuário
            const employee = await prisma_js_1.default.employee.findFirst({
                where: { userId, status: 'ACTIVE' },
                include: {
                    company: {
                        include: {
                            benefits: {
                                where: { type: 'MEDICINE_SUBSIDY', isActive: true }
                            }
                        }
                    }
                }
            });
            if (!employee || !employee.company?.benefits?.length) {
                return { isEligible: false, subsidyAmount: 0, finalAmount: totalAmount, reason: 'Nenhum benefício de subsídio encontrado.' };
            }
            // Pegamos o primeiro benefício de subsídio ativo
            const benefit = employee.company.benefits[0];
            const subsidyPercentage = benefit.subsidyPercentage || 0;
            const maxMonthlyValue = benefit.maxMonthlyValue || 0;
            // 2. Verificar o quanto já foi utilizado no mês atual
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const utilizedThisMonth = await prisma_js_1.default.journalEntry.aggregate({
                where: {
                    creditAccountId: {
                        contains: userId // Simplificação
                    },
                    description: { contains: 'Subsídio Farmácia' },
                    createdAt: { gte: startOfMonth }
                },
                _sum: { amount: true }
            });
            const currentUsage = utilizedThisMonth._sum.amount || 0;
            const remainingBudget = maxMonthlyValue > 0 ? Math.max(0, maxMonthlyValue - currentUsage) : Infinity;
            if (remainingBudget <= 0 && maxMonthlyValue > 0) {
                return { isEligible: false, subsidyAmount: 0, finalAmount: totalAmount, reason: 'Limite mensal de subsídio atingido.' };
            }
            // 3. Calcular valor do subsídio
            let theoreticalSubsidy = totalAmount * (subsidyPercentage / 100);
            const appliedSubsidy = Math.min(theoreticalSubsidy, remainingBudget);
            return {
                isEligible: true,
                subsidyAmount: Number(appliedSubsidy.toFixed(2)),
                finalAmount: Number((totalAmount - appliedSubsidy).toFixed(2)),
                benefitId: benefit.id
            };
        }
        catch (error) {
            logger_js_1.logger.error('[SubsidyService] Erro ao calcular subsídio:', error);
            return { isEligible: false, subsidyAmount: 0, finalAmount: totalAmount, reason: 'Erro interno ao calcular benefício.' };
        }
    }
}
exports.SubsidyService = SubsidyService;
exports.subsidyService = new SubsidyService();
//# sourceMappingURL=subsidy.service.js.map