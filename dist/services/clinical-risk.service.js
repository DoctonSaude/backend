"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicalRiskService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const logger_js_1 = require("../lib/logger.js");
const predictive_alerts_service_js_1 = __importDefault(require("./ai/predictive-alerts.service.js"));
class ClinicalRiskService {
    /**
     * Calcula o risco clínico de um paciente baseado em logs de saúde
     */
    static async calculateClinicalRisk(patientId) {
        try {
            const logs = await prisma_js_1.default.healthLog.findMany({
                where: { patientId },
                orderBy: { logDate: 'desc' },
                take: 50
            });
            let riskScore = 0;
            const bpLogs = logs.filter((l) => l.type === 'blood_pressure');
            const glucoseLogs = logs.filter((l) => l.type === 'glucose');
            // Exemplo de lógica: Pressão arterial
            if (bpLogs.length > 0) {
                const lastBP = bpLogs[0].value; // Formato esperado "140/90"
                const [sys, dia] = lastBP.split('/').map(Number);
                if (sys > 140 || dia > 90)
                    riskScore += 30;
                if (sys > 160 || dia > 100)
                    riskScore += 50;
            }
            // Exemplo de lógica: Glicose
            if (glucoseLogs.length > 0) {
                const lastGlucose = Number(glucoseLogs[0].value);
                if (lastGlucose > 120)
                    riskScore += 20;
                if (lastGlucose > 200)
                    riskScore += 40;
            }
            let riskLevel = 'LOW';
            if (riskScore >= 70)
                riskLevel = 'HIGH';
            else if (riskScore >= 30)
                riskLevel = 'MEDIUM';
            // Atualizar o nível de risco do funcionário se ele estiver vinculado a uma empresa
            await this.syncRiskWithB2B(patientId, riskLevel);
            return riskLevel;
        }
        catch (error) {
            logger_js_1.logger.error('[ClinicalRisk] Erro ao calcular risco:', error);
            return 'LOW';
        }
    }
    /**
     * Sincroniza o risco clínico com o registro de funcionário B2B
     */
    static async syncRiskWithB2B(patientId, riskLevel) {
        const patient = await prisma_js_1.default.patient.findUnique({
            where: { id: patientId },
            include: { person: { include: { user: true } } }
        });
        const userId = patient?.person?.user?.id;
        if (userId) {
            await prisma_js_1.default.employee.updateMany({
                where: { userId },
                data: { healthRiskLevel: riskLevel }
            });
        }
    }
    /**
     * Gera alertas preditivos se o risco subir
     */
    static async triggerRiskAlerts(patientId, riskLevel) {
        if (riskLevel === 'HIGH') {
            await predictive_alerts_service_js_1.default.createAlert(patientId, 'clinical_risk', 'high', 'Detectamos padrões em seus sinais vitais que sugerem risco elevado. Recomendamos uma consulta preventiva.', { riskSource: 'HealthLogs' });
        }
    }
}
exports.ClinicalRiskService = ClinicalRiskService;
//# sourceMappingURL=clinical-risk.service.js.map