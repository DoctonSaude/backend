"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const unifiedNotification_service_js_1 = __importDefault(require("../unifiedNotification.service.js"));
class PredictiveAlertsService {
    /**
     * Analyze user health patterns and generate alerts
     */
    async analyzeHealthPatterns(userId) {
        // Get user's recent health logs
        const healthLogs = await prisma_js_1.default.healthLog.findMany({
            where: { patientId: userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        const patterns = [];
        const bpAlert = this.analyzeBloodPressure(healthLogs);
        if (bpAlert)
            patterns.push(bpAlert);
        const noShowAlert = await this.analyzeNoShowRisk(userId);
        if (noShowAlert)
            patterns.push(noShowAlert);
        const checkupAlert = await this.analyzeCheckupNeeds(userId);
        if (checkupAlert)
            patterns.push(checkupAlert);
        return patterns;
    }
    analyzeBloodPressure(healthLogs) {
        const bloodPressureReadings = healthLogs
            .filter((log) => {
            const data = typeof log.data === 'string' ? JSON.parse(log.data) : log.data;
            return data.systolic && data.diastolic;
        })
            .map((log) => {
            const data = typeof log.data === 'string' ? JSON.parse(log.data) : log.data;
            return {
                systolic: data.systolic,
                diastolic: data.diastolic,
                date: log.createdAt
            };
        });
        if (bloodPressureReadings.length < 3)
            return null;
        const avgSystolic = bloodPressureReadings.reduce((sum, r) => sum + r.systolic, 0) / bloodPressureReadings.length;
        const avgDiastolic = bloodPressureReadings.reduce((sum, r) => sum + r.diastolic, 0) / bloodPressureReadings.length;
        // Check for hypertension pattern
        if (avgSystolic > 140 || avgDiastolic > 90) {
            return {
                type: 'vital_signs',
                severity: avgSystolic > 160 || avgDiastolic > 100 ? 'high' : 'medium',
                message: `Suas últimas ${bloodPressureReadings.length} medições de pressão arterial mostram valores elevados (média: ${avgSystolic.toFixed(0)}/${avgDiastolic.toFixed(0)} mmHg). Recomendamos consulta com cardiologista.`,
                data: {
                    avgSystolic: avgSystolic.toFixed(0),
                    avgDiastolic: avgDiastolic.toFixed(0),
                    readings: bloodPressureReadings.length,
                },
            };
        }
        return null;
    }
    /**
     * Analyze no-show risk based on appointment history
     */
    async analyzeNoShowRisk(userId) {
        const recentAppointments = await prisma_js_1.default.appointment.findMany({
            where: {
                patientId: userId,
                createdAt: {
                    gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        if (recentAppointments.length < 3)
            return null;
        const noShows = recentAppointments.filter((apt) => apt.status === 'NO_SHOW' || apt.status === 'CANCELLED').length;
        const noShowRate = noShows / recentAppointments.length;
        if (noShowRate > 0.3) {
            // 30% no-show rate
            return {
                type: 'no_show',
                severity: noShowRate > 0.5 ? 'high' : 'medium',
                message: `Detectamos que você perdeu ${noShows} de ${recentAppointments.length} consultas recentes. Podemos ajudar com lembretes ou reagendamento?`,
                data: {
                    noShows,
                    total: recentAppointments.length,
                    rate: (noShowRate * 100).toFixed(0),
                },
            };
        }
        return null;
    }
    /**
     * Analyze medication adherence
     */
    async analyzeMedicationAdherence(userId) {
        void userId;
        // This would require medication tracking data
        return null;
    }
    /**
     * Analyze checkup needs based on last visit
     */
    async analyzeCheckupNeeds(userId) {
        const lastAppointment = await prisma_js_1.default.appointment.findFirst({
            where: {
                patientId: userId,
                status: 'COMPLETED',
            },
            orderBy: { dateTime: 'desc' },
        });
        if (!lastAppointment) {
            return {
                type: 'checkup',
                severity: 'low',
                message: 'Não encontramos registro de consultas recentes. Que tal agendar um check-up preventivo?',
                data: {
                    lastVisit: null,
                },
            };
        }
        const daysSinceLastVisit = Math.floor((Date.now() - lastAppointment.dateTime.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastVisit > 365) {
            // More than 1 year
            return {
                type: 'checkup',
                severity: 'medium',
                message: `Sua última consulta foi há ${Math.floor(daysSinceLastVisit / 30)} meses. Recomendamos agendar um check-up preventivo.`,
                data: {
                    lastVisit: lastAppointment.dateTime,
                    daysSince: daysSinceLastVisit,
                },
            };
        }
        return null;
    }
    /**
     * Create predictive alert
     */
    async createAlert(userId, type, severity, message, data) {
        const alert = await prisma_js_1.default.predictiveAlert.create({
            data: {
                userId,
                type,
                severity,
                message,
                data: JSON.stringify(data),
                dismissed: false,
            },
        });
        // Se a severidade for alta ou média, disparar notificação unificada
        if (severity === 'high' || severity === 'medium') {
            try {
                await unifiedNotification_service_js_1.default.notify({
                    userId,
                    title: severity === 'high' ? '🚨 Alerta de Saúde Crítico' : '⚠️ Insights de Saúde',
                    message,
                    priority: (severity === 'high' ? 'high' : 'medium'),
                    data: { type: 'HEALTH_ALERT', alertId: alert.id, ...data },
                    link: '/patient/insights'
                }, ['in-app', 'push']);
            }
            catch (notifyError) {
                console.error(`Erro ao disparar notificação unificada para alerta ${alert.id}:`, notifyError);
            }
        }
    }
    /**
     * Get user alerts
     */
    async getUserAlerts(userId, includesDismissed = false) {
        const alerts = await prisma_js_1.default.predictiveAlert.findMany({
            where: {
                userId,
                ...(includesDismissed ? {} : { dismissed: false }),
            },
            orderBy: { createdAt: 'desc' }
        });
        return alerts.map((alert) => ({
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            data: JSON.parse(alert.data || '{}'),
            dismissed: alert.dismissed,
            createdAt: alert.createdAt,
        }));
    }
    /**
     * Dismiss alert
     */
    async dismissAlert(alertId) {
        await prisma_js_1.default.predictiveAlert.update({
            where: { id: alertId },
            data: { dismissed: true },
        });
    }
    /**
     * Run daily analysis for all active users
     */
    async runDailyAnalysis() {
        const activeUsers = await prisma_js_1.default.patient.findMany({
            where: {
                lastActiveDate: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
            },
            select: { id: true },
        });
        console.log(`Running daily analysis for ${activeUsers.length} active users...`);
        for (const user of activeUsers) {
            try {
                const patterns = await this.analyzeHealthPatterns(user.id);
                for (const pattern of patterns) {
                    await this.createAlert(user.id, pattern.type, pattern.severity, pattern.message, pattern.data);
                }
            }
            catch (error) {
                console.error(`Error analyzing user ${user.id}:`, error);
            }
        }
        console.log('Daily analysis completed');
    }
}
exports.default = new PredictiveAlertsService();
//# sourceMappingURL=predictive-alerts.service.js.map