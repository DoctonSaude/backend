"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.intelligenceService = exports.IntelligenceService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const aiInsight_service_js_1 = require("./aiInsight.service.js");
const inAppNotification_service_js_1 = __importDefault(require("./inAppNotification.service.js"));
const socket_js_1 = require("../lib/socket.js");
const logger_js_1 = require("../lib/logger.js");
class IntelligenceService {
    /**
     * Analisa o perfil de risco do paciente com base nos logs recentes
     */
    async analyzeRiskProfile(patientId) {
        logger_js_1.logger.info(`[IntelligenceService] Analyzing risk profile for patient ${patientId}`);
        const logs = await prisma_js_1.default.healthLog.findMany({
            where: { patientId },
            orderBy: { logDate: 'desc' },
            take: 30
        });
        if (logs.length < 5)
            return { level: 'NEUTRAL', factors: [] };
        const moodLogs = logs.filter(l => l.type === 'MOOD');
        const stressLogs = logs.filter(l => l.type === 'STRESS');
        const sleepLogs = logs.filter(l => l.type === 'SLEEP');
        const factors = [];
        let riskScore = 0;
        // Detecção de Tendência de Humor
        if (moodLogs.length >= 3) {
            const recentMoods = moodLogs.slice(0, 3).map(l => l.value);
            if (recentMoods.every(m => ['Mal', 'Cansado', '1', '2'].includes(m))) {
                factors.push('Tendência de humor baixo detectada');
                riskScore += 40;
            }
        }
        // Detecção de Privação de Sono
        if (sleepLogs.length >= 3) {
            const avgSleep = sleepLogs.slice(0, 3).reduce((acc, l) => acc + Number(l.value), 0) / 3;
            if (avgSleep < 6) {
                factors.push('Privação de sono recorrente (< 6h)');
                riskScore += 30;
            }
        }
        // Detecção de Estresse Elevado
        if (stressLogs.length > 0 && ['High', 'Muito Alto'].includes(stressLogs[0].value)) {
            factors.push('Níveis de estresse elevados hoje');
            riskScore += 30;
        }
        let level = 'NEUTRAL';
        if (riskScore >= 70)
            level = 'HIGH';
        else if (riskScore >= 40)
            level = 'MEDIUM';
        else if (riskScore > 0)
            level = 'LOW';
        return { level, factors, updatedAt: new Date() };
    }
    /**
     * Gera um "Nudge" diário (micro-orientação motivacional)
     */
    async generateDailyNudge(userId) {
        const user = await prisma_js_1.default.user.findUnique({
            where: { id: userId },
            include: {
                person: {
                    include: {
                        patient: {
                            include: {
                                healthLogs: { take: 5, orderBy: { logDate: 'desc' } },
                                wearableConnections: true
                            }
                        }
                    }
                }
            }
        });
        if (!user?.person?.patient)
            return null;
        const patient = user.person.patient;
        const name = user.name?.split(' ')[0] || 'Herói';
        const logs = patient.healthLogs;
        // Lógica de Heurística Avançada para Nudges
        if (logs.length === 0) {
            return {
                message: `Olá ${name}! Que tal começar o dia registrando como você dormiu? 😴`,
                type: 'engagement'
            };
        }
        const lastMood = logs.find(l => l.type === 'MOOD');
        if (lastMood && ['Mal', 'Cansado', '1', '2'].includes(lastMood.value)) {
            return {
                message: `Oi ${name}. Notamos que você se sentiu um pouco cansado ultimamente. Uma pausa para respirar fundo pode ajudar! 🌬️`,
                type: 'health_support'
            };
        }
        const lastSteps = logs.find(l => l.type === 'STEPS');
        if (lastSteps && Number(lastSteps.value) > 10000) {
            return {
                message: `Incrível, ${name}! Você bateu sua meta de passos. Mantenha essa energia! 🏃‍♂️`,
                type: 'achievement'
            };
        }
        const hasWearable = patient.wearableConnections.length > 0;
        if (!hasWearable) {
            return {
                message: `Sabia que você pode conectar seu Google Fit ou Apple Health? Facilita muito seus registros! ⌚`,
                type: 'feature_discovery'
            };
        }
        return {
            message: `Bom dia, ${name}! Beber água agora vai dar um gás no seu metabolismo. 💧`,
            type: 'lifestyle'
        };
    }
    /**
     * Dispara nudges para todos os pacientes ativos
     */
    async triggerGlobalNudges() {
        const patients = await prisma_js_1.default.patient.findMany({
            where: { user: { role: 'PATIENT' } },
            include: { user: true }
        });
        const results = { sent: 0, failed: 0 };
        for (const patient of patients) {
            try {
                const nudge = await this.generateDailyNudge(patient.userId);
                if (nudge) {
                    // Enviar notificação in-app
                    await inAppNotification_service_js_1.default.createNotification({
                        userId: patient.userId,
                        type: 'nudge',
                        title: '💡 Dica do Dia',
                        message: nudge.message,
                        priority: 'medium',
                        link: '/patient/perfil'
                    });
                    // Tentar enviar Push se disponível
                    // await notificationService.sendPushNotification(patient.userId, { title: 'Dica do Dia', body: nudge.message });
                    results.sent++;
                }
            }
            catch (err) {
                logger_js_1.logger.error(`Error sending nudge to patient ${patient.id}`, err);
                results.failed++;
            }
        }
        return results;
    }
    /**
     * Emite uma atualização de saúde via Socket.io
     */
    async emitHealthUpdate(userId, data) {
        try {
            const io = socket_js_1.SocketService.getInstance();
            io.to(`user:${userId}`).emit('healthUpdate', {
                ...data,
                timestamp: new Date()
            });
            logger_js_1.logger.info(`[IntelligenceService] Health update emitted for user ${userId}`);
        }
        catch (err) {
            logger_js_1.logger.error(`[IntelligenceService] Failed to emit socket update:`, err);
        }
    }
    /**
     * Wrapper para o aiInsightService
     */
    async getInsights(userId) {
        return aiInsight_service_js_1.aiInsightService.generatePatientInsights(userId);
    }
}
exports.IntelligenceService = IntelligenceService;
exports.intelligenceService = new IntelligenceService();
//# sourceMappingURL=intelligence.service.js.map