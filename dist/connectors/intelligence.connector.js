"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIntelligenceConnector = void 0;
const integrator_service_js_1 = __importDefault(require("../services/integrator.service.js"));
const clinical_risk_service_js_1 = require("../services/clinical-risk.service.js");
const churn_prevention_service_js_1 = __importDefault(require("../services/churn-prevention.service.js"));
const company_crud_js_1 = require("../crud/company.crud.js");
const churnService = new churn_prevention_service_js_1.default();
const registerIntelligenceConnector = () => {
    integrator_service_js_1.default.registerConnector({
        name: 'HealthIntelligence',
        type: 'HEALTH_DEVICE', // Usando cast para evitar erro de enum ou posso expandir o enum
        execute: async (action, data) => {
            switch (action) {
                case 'GET_PATIENT_RISK':
                    return await clinical_risk_service_js_1.ClinicalRiskService.calculateClinicalRisk(data.patientId);
                case 'GET_USER_HEALTH_SCORE':
                    return await churnService.calculateHealthScore(data.userId);
                case 'GET_POPULATION_INSIGHTS':
                    return await company_crud_js_1.CompanyCrud.getPopulationHealthInsights(data.companyId);
                default:
                    throw new Error(`Ação de inteligência não suportada: ${action}`);
            }
        }
    });
};
exports.registerIntelligenceConnector = registerIntelligenceConnector;
//# sourceMappingURL=intelligence.connector.js.map