import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export class SubsidyService {
    /**
     * Calcula o subsídio para um paciente em um determinado valor de compra
     */
    async calculateSubsidy(userId: string, totalAmount: number) {
        try {
            // 1. Buscar o vínculo de funcionário do usuário
            const employee = await prisma.employee.findFirst({
                where: ({ userId, status: 'ACTIVE' } as any),
                include: ({
                    company: {
                        include: {
                            benefits: {
                                where: { type: 'MEDICINE_SUBSIDY', isActive: true }
                            }
                        }
                    }
                } as any)
            }) as any;

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

            const utilizedThisMonth = await prisma.journalEntry.aggregate({
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
            const remainingBudget = maxMonthlyValue > 0 ? Math.max(0, maxMonthlyValue - (currentUsage as number)) : Infinity;

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
            logger.error('[SubsidyService] Erro ao calcular subsídio:', error);
            return { isEligible: false, subsidyAmount: 0, finalAmount: totalAmount, reason: 'Erro interno ao calcular benefício.' };
        }
    }
}

export const subsidyService = new SubsidyService();
