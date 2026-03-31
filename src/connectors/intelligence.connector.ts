import integratorService from '../services/integrator.service.js';
import { ClinicalRiskService } from '../services/clinical-risk.service.js';
import ChurnPreventionService from '../services/churn-prevention.service.js';
import { CompanyCrud } from '../crud/company.crud.js';

const churnService = new ChurnPreventionService();

export const registerIntelligenceConnector = () => {
    integratorService.registerConnector({
        name: 'HealthIntelligence',
        type: 'HEALTH_DEVICE' as any, // Usando cast para evitar erro de enum ou posso expandir o enum
        execute: async (action: string, data) => {
            switch (action) {
                case 'GET_PATIENT_RISK':
                    return await ClinicalRiskService.calculateClinicalRisk(data.patientId);
                case 'GET_USER_HEALTH_SCORE':
                    return await churnService.calculateHealthScore(data.userId);
                case 'GET_POPULATION_INSIGHTS':
                    return await CompanyCrud.getPopulationHealthInsights(data.companyId);
                default:
                    throw new Error(`Ação de inteligência não suportada: ${action}`);
            }
        }
    });
};
