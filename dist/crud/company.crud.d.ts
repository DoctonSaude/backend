import { CompanyData } from '../types/common.js';
export declare const CompanyCrud: {
    /**
     * Cria uma nova empresa vinculada a um tenant
     */
    create(data: CompanyData): Promise<any>;
    /**
     * Vincula um usuário como funcionário de uma empresa
     */
    addEmployee(companyId: string, userId: string, data: any): Promise<any>;
    /**
     * Busca benefícios de uma empresa para um funcionário específico
     */
    getEmployeeBenefits(userId: string): Promise<any>;
    /**
     * Gera um relatório de utilização simplificado (Sinistralidade)
     */
    generateUtilizationReport(companyId: string, period: string): Promise<any>;
    /**
     * Retorna insights de saúde populacional para uma empresa
     */
    getPopulationHealthInsights(companyId: string): Promise<{
        total: any;
        active: any;
        riskDistribution: {
            HIGH: any;
            MEDIUM: any;
            LOW: any;
        };
    }>;
};
//# sourceMappingURL=company.crud.d.ts.map