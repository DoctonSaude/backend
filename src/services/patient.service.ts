import prisma from '../lib/prisma.js';
import { cacheService, Cacheable, CacheService } from './cache.service.js';
import { logger } from '../lib/logger.js';
import { aiInsightService } from './aiInsight.service.js';
import { intelligenceService } from './intelligence.service.js';

export class PatientService {
    /**
     * Obtém os dados consolidados do dashboard do paciente com cache
     */
    @Cacheable({ ttl: 300, tags: ['patient', 'dashboard'] })
    async getDashboardData(userId: string) {
        logger.info(`[PatientService] Fetching dashboard data for user ${userId}`);

        // 1. Buscar Paciente e Perfil
        // Tenta via person (relação legada) e depois diretamente via userId (website/novos usuários)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                person: {
                    include: {
                        patient: {
                            include: {
                                subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true }, take: 1 }
                            }
                        }
                    }
                },
                patient: {
                    include: {
                        subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true }, take: 1 }
                    }
                }
            }
        });

        // Prioridade: person.patient (backend legado) → patient direto (website/novo registro)
        let patient = user?.person?.patient ?? user?.patient ?? null;

        if (!patient) {
            // Último recurso: auto-criar registro de paciente para não deslogar o usuário
            logger.warn(`[PatientService] Nenhum registro de paciente encontrado para userId: ${userId}. Criando...`);
            try {
                patient = await prisma.patient.create({
                    data: {
                        userId,
                        archetype: 'GENERAL',
                        healthPoints: 0,
                        experiencePoints: 0,
                        level: 1,
                        onboardingCompleted: false
                    },
                    include: {
                        subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true }, take: 1 }
                    }
                }) as any;
            } catch (createErr) {
                logger.error(`[PatientService] Falha ao auto-criar paciente:`, createErr);
                return null;
            }
        }

        const patientId = patient.id;
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // 2. Fetch de Dados em Paralelo (Prisma e Inteligência)
        const [
            appointments,
            totalAppointments,
            completedAppointments,
            recentLogs,
            todayMood,
            activeChallengeCount,
            riskProfile,
            dailyNudge
        ] = await Promise.all([
            prisma.appointment.findMany({
                where: {
                    patientId,
                    dateTime: { gte: sixMonthsAgo }
                },
                select: {
                    id: true,
                    dateTime: true,
                    status: true,
                    isOnline: true,
                    partner: {
                        select: {
                            user: { select: { name: true, avatar: true } },
                            specialty: true
                        }
                    }
                },
                orderBy: { dateTime: 'asc' }
            }),
            prisma.appointment.count({ where: { patientId } }),
            prisma.appointment.count({ where: { patientId, status: 'COMPLETED' } }),
            prisma.healthLog.findMany({
                where: { patientId },
                orderBy: { logDate: 'desc' },
                take: 20
            }),
            prisma.healthLog.findFirst({
                where: {
                    patientId,
                    type: 'MOOD',
                    logDate: { gte: startOfToday }
                }
            }),
            prisma.patientChallenge.count({
                where: { patientId, status: 'ACTIVE' }
            }),
            intelligenceService.analyzeRiskProfile(patientId),
            intelligenceService.generateDailyNudge(userId)
        ]);

        // 3. AI Insights (Processamento em paralelo)
        const [isLowDay, weeklyNarrative, actionPlan, insights] = await Promise.all([
            Promise.resolve(aiInsightService.detectLowDay(recentLogs)),
            Promise.resolve(aiInsightService.generateWeeklyNarrative(recentLogs, user.name || 'Paciente')),
            aiInsightService.generateDailyActions({ ...patient, user: { name: user.name } } as any, aiInsightService.detectLowDay(recentLogs)),
            aiInsightService.generatePatientInsights(userId)
        ]);

        // 4. Transformação para Gráficos
        const monthsMap = new Map();
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleString('pt-BR', { month: 'short' });
            monthsMap.set(key, { month: key, consultas: 0, concluidas: 0, sortDate: d.getTime() });
        }

        appointments.forEach(appt => {
            const d = new Date(appt.dateTime);
            const key = d.toLocaleString('pt-BR', { month: 'short' });
            if (monthsMap.has(key)) {
                const entry = monthsMap.get(key);
                entry.consultas += 1;
                if (appt.status === 'COMPLETED') entry.concluidas += 1;
            }
        });

        const chartMonthsData = Array.from(monthsMap.values())
            .sort((a, b) => a.sortDate - b.sortDate)
            .map(({ sortDate, ...rest }) => rest);

        const onlineCount = appointments.filter(a => a.isOnline).length;
        const inPersonCount = appointments.length - onlineCount;

        // Próximo agendamento
        const nextAppointment = appointments.find(a =>
            new Date(a.dateTime) > now && (a.status === 'SCHEDULED' || a.status === 'CONFIRMED')
        );

        // Resumo de Saúde
        const lastBPM = recentLogs.find(l => l.type === 'BPM')?.value || null;
        const lastBMI = recentLogs.find(l => l.type === 'BMI')?.value || null;

        // 5. Retorno Consolidado (Legacy Friendly)
        return {
            profile: {
                ...patient,
                name: user.name,
                avatar: user.avatar,
                email: user.email,
                plan: patient.subscriptions[0]?.plan?.name || 'Gratuito'
            },
            stats: {
                totalAppointments,
                completedAppointments,
                points: patient.healthPoints || 0,
                xp: patient.experiencePoints || 0,
                level: patient.level || 1,
                activeChallenges: activeChallengeCount,
                todayMood: todayMood?.value || null
            },
            nextAppointment: nextAppointment ? {
                ...nextAppointment,
                dateTime: nextAppointment.dateTime.toISOString()
            } : null,
            charts: {
                activity: chartMonthsData,
                monthsData: chartMonthsData, // alias
                typeData: [
                    { name: 'Online', value: onlineCount, color: '#3B82F6' },
                    { name: 'Presencial', value: inPersonCount, color: '#10B981' }
                ],
                pointsData: Array.from({ length: 7 }, (_, i) => ({ dia: `${i + 1}`, pontos: patient.healthPoints || 0 }))
            },
            healthSummary: {
                lastBPM,
                lastBMI,
                todayMood: todayMood?.value || null
            },
            gamification: {
                level: patient.level || 1,
                levelTitle: patient.levelTitle || 'Iniciante',
                levelTier: patient.levelTier || 'BRONZE',
                healthPoints: patient.healthPoints || 0,
                experiencePoints: patient.experiencePoints || 0,
                currentStreak: patient.currentStreak || 0,
                nextLevelPoints: ((patient.level || 1) + 1) * ((patient.level || 1) + 1) * 50
            },
            isLowDay,
            weeklyNarrative,
            actionPlan,
            insights,
            recentLogs,
            riskProfile,
            dailyNudge
        };
    }

    /**
     * Invalida o cache do dashboard para um usuário
     */
    async invalidateDashboard(userId: string) {
        const key = CacheService.generateKey('PatientService', 'getDashboardData', { args: [userId] });
        await cacheService.delete(key);
        logger.info(`[PatientService] Cache invalidated for user ${userId}`);
    }
}

export const patientService = new PatientService();
