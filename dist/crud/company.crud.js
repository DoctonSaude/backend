"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyCrud = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const logger_js_1 = require("../lib/logger.js");
const audit_service_js_1 = require("../services/audit.service.js");
exports.CompanyCrud = {
    /**
     * Cria uma nova empresa vinculada a um tenant
     */
    async create(data) {
        try {
            const company = await prisma_js_1.default.company.create({
                data,
            });
            logger_js_1.logger.info(`[B2B] Empresa criada: ${company.name} (ID: ${company.id})`);
            return company;
        }
        catch (error) {
            logger_js_1.logger.error('[B2B] Erro ao criar empresa:', error);
            throw error;
        }
    },
    /**
     * Vincula um usuário como funcionário de uma empresa
     */
    async addEmployee(companyId, userId, data) {
        try {
            const employee = await prisma_js_1.default.employee.upsert({
                where: {
                    userId_companyId: { userId, companyId }
                },
                update: { ...data, status: 'ACTIVE' },
                create: { userId, companyId, ...data }
            });
            await audit_service_js_1.AuditService.log({
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
            logger_js_1.logger.error('[B2B] Erro ao adicionar funcionário:', error);
            throw error;
        }
    },
    /**
     * Busca benefícios de uma empresa para um funcionário específico
     */
    async getEmployeeBenefits(userId) {
        const employee = await prisma_js_1.default.employee.findFirst({
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
    async generateUtilizationReport(companyId, period) {
        const report = await prisma_js_1.default.utilizationReport.create({
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
    async getPopulationHealthInsights(companyId) {
        try {
            const employees = await prisma_js_1.default.employee.findMany({
                where: { companyId },
                select: { healthRiskLevel: true, status: true }
            });
            const stats = {
                total: employees.length,
                active: employees.filter((e) => e.status === 'ACTIVE').length,
                riskDistribution: {
                    HIGH: employees.filter((e) => e.healthRiskLevel === 'HIGH').length,
                    MEDIUM: employees.filter((e) => e.healthRiskLevel === 'MEDIUM').length,
                    LOW: employees.filter((e) => e.healthRiskLevel === 'LOW' || !e.healthRiskLevel).length
                }
            };
            logger_js_1.logger.info(`[B2B] Insights de saúde populacional gerados para empresa ${companyId}`);
            return stats;
        }
        catch (error) {
            logger_js_1.logger.error('[B2B] Erro ao gerar insights populacionais:', error);
            throw error;
        }
    },
};
//# sourceMappingURL=company.crud.js.map