import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import predictiveAlertsService from './ai/predictive-alerts.service.js';

export class ClinicalRiskService {
    /**
     * Calcula o risco clínico de um paciente baseado em logs de saúde
     */
    static async calculateClinicalRisk(patientId: string): Promise<string> {
        try {
            const logs = await prisma.healthLog.findMany({
                where: { patientId },
                orderBy: { logDate: 'desc' },
                take: 50
            });

            let riskScore = 0;
            const bpLogs = logs.filter((l: any) => (l as any).type === 'blood_pressure');
            const glucoseLogs = logs.filter((l: any) => (l as any).type === 'glucose');

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
            logger.error('[ClinicalRisk] Erro ao calcular risco:', error);
            return 'LOW';
        }
    }

    /**
     * Sincroniza o risco clínico com o registro de funcionário B2B
     */
    static async syncRiskWithB2B(patientId: string, riskLevel: string) {
        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            include: { person: { include: { user: true } } } as any
        });

        const userId = (patient?.person as any)?.user?.id;
        if (userId) {
            await (prisma as any).employee.updateMany({
                where: { userId },
                data: { healthRiskLevel: riskLevel }
            });
        }
    }

    /**
     * Gera alertas preditivos se o risco subir
     */
    static async triggerRiskAlerts(patientId: string, riskLevel: string) {
        if (riskLevel === 'HIGH') {
            await (predictiveAlertsService as any).createAlert(patientId, 'clinical_risk', 'high', 'Detectamos padrões em seus sinais vitais que sugerem risco elevado. Recomendamos uma consulta preventiva.', { riskSource: 'HealthLogs' });
        }
    }
}
