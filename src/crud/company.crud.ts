import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { AuditService } from '../services/audit.service.js';
import { CompanyData } from '../types/common.js';

export const CompanyCrud = {
    /**
     * Cria uma nova empresa vinculada a um economicGroup
     */
    async create(data: CompanyData) {
        try {
            const company = await (prisma as any).company.create({
                data,
            });
            logger.info(`[B2B] Empresa criada: ${company.name} (ID: ${company.id})`);
            return company;
        }
        catch (error) {
            logger.error('[B2B] Erro ao criar empresa:', error);
            throw error;
        }
    },

    /**
     * Vincula um usuário como funcionário de uma empresa
     */
    async addEmployee(companyId: string, userId: string, data) {
        try {
            const employee = await (prisma as any).employee.upsert({
                where: {
                    userId_companyId: { userId, companyId }
                },
                update: { ...data, status: 'ACTIVE' },
                create: { userId, companyId, ...data }
            });

            await AuditService.log({
                userId,
                action: 'EMPLOYEE_ENROLL',
                resource: 'Employee',
                resourceId: employee.id,
                payload: { companyId },
                ipAddress: '0.0.0.0' // IP temporário para log interno
            });

            return employee;
        }
        catch (error) {
            logger.error('[B2B] Erro ao adicionar funcionário:', error);
            throw error;
        }
    },

    /**
     * Busca benefícios de uma empresa para um funcionário específico
     */
    async getEmployeeBenefits(userId: string) {
        const employee = await (prisma as any).employee.findFirst({
            where: { userId, status: 'ACTIVE' },
            include: {
                company: {
                    include: { benefits: true }
                }
            }
        });
        return employee?.company?.benefits || [];
    },

    /**
     * Gera um relatório de utilização simplificado (Sinistralidade)
     */
    async generateUtilizationReport(companyId: string, period: string) {
        const report = await (prisma as any).utilizationReport.create({
            data: {
                companyId,
                period,
                totalUsers: 0,
                totalClaims: 0,
                totalCost: 0,
                sinistrality: 0,
                mainHealthIssues: 'Relatório Gerado via Orquestrador'
            }
        });
        return report;
    },

    /**
     * Retorna insights de saúde populacional para uma empresa
     */
    async getPopulationHealthInsights(companyId: string) {
        try {
            const employees = await (prisma as any).employee.findMany({
                where: { companyId },
                select: { healthRiskLevel: true, status: true }
            });

            const stats = {
                total: employees.length,
                active: employees.filter((e: any) => e.status === 'ACTIVE').length,
                riskDistribution: {
                    HIGH: employees.filter((e: any) => e.healthRiskLevel === 'HIGH').length,
                    MEDIUM: employees.filter((e: any) => e.healthRiskLevel === 'MEDIUM').length,
                    LOW: employees.filter((e: any) => e.healthRiskLevel === 'LOW' || !e.healthRiskLevel).length
                }
            };

            logger.info(`[B2B] Insights de saúde populacional gerados para empresa ${companyId}`);
            return stats;
        }
        catch (error) {
            logger.error('[B2B] Erro ao gerar insights populacionais:', error);
            throw error;
        }
    },
};
