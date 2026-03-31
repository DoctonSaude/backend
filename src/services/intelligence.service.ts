import prisma from '../lib/prisma.js';
import { aiInsightService } from './aiInsight.service.js';
import inAppNotificationService from './inAppNotification.service.js';
import { SocketService } from '../lib/socket.js';
import { logger } from '../lib/logger.js';

export class IntelligenceService {
    /**
     * Analisa o perfil de risco do paciente com base nos logs recentes
     */
    async analyzeRiskProfile(patientId: string) {
        logger.info(`[IntelligenceService] Analyzing risk profile for patient ${patientId}`);

        const logs = await prisma.healthLog.findMany({
            where: { patientId },
            orderBy: { logDate: 'desc' },
            take: 30
        });

        if (logs.length < 5) return { level: 'NEUTRAL', factors: [] };

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

        let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'NEUTRAL' = 'NEUTRAL';
        if (riskScore >= 70) level = 'HIGH';
        else if (riskScore >= 40) level = 'MEDIUM';
        else if (riskScore > 0) level = 'LOW';

        return { level, factors, updatedAt: new Date() };
    }

    /**
     * Gera um "Nudge" diário (micro-orientação motivacional)
     */
    async generateDailyNudge(userId: string) {
        const user = await prisma.user.findUnique({
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

        if (!user?.person?.patient) return null;

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
        const patients = await prisma.patient.findMany({
            where: { user: { role: 'PATIENT' } },
            include: { user: true }
        });

        const results = { sent: 0, failed: 0 };

        for (const patient of patients) {
            try {
                const nudge = await this.generateDailyNudge(patient.userId!);
                if (nudge) {
                    // Enviar notificação in-app
                    await inAppNotificationService.createNotification({
                        userId: patient.userId!,
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
            } catch (err) {
                logger.error(`Error sending nudge to patient ${patient.id}`, err);
                results.failed++;
            }
        }

        return results;
    }

    /**
     * Emite uma atualização de saúde via Socket.io
     */
    async emitHealthUpdate(userId: string, data: any) {
        try {
            const io = SocketService.getInstance();
            io.to(`user:${userId}`).emit('healthUpdate', {
                ...data,
                timestamp: new Date()
            });
            logger.info(`[IntelligenceService] Health update emitted for user ${userId}`);
        } catch (err) {
            logger.error(`[IntelligenceService] Failed to emit socket update:`, err);
        }
    }

    /**
     * Wrapper para o aiInsightService
     */
    async getInsights(userId: string) {
        return aiInsightService.generatePatientInsights(userId);
    }
}

export const intelligenceService = new IntelligenceService();
