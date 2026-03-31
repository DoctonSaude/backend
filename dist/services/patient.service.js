"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientService = exports.PatientService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const cache_service_js_1 = require("./cache.service.js");
const logger_js_1 = require("../lib/logger.js");
const aiInsight_service_js_1 = require("./aiInsight.service.js");
const intelligence_service_js_1 = require("./intelligence.service.js");
class PatientService {
    /**
     * Obtém os dados consolidados do dashboard do paciente com cache
     */
    async getDashboardData(userId) {
        logger_js_1.logger.info(`[PatientService] Fetching dashboard data for user ${userId}`);
        // 1. Buscar Paciente e Perfil
        // Tenta via person (relação legada) e depois diretamente via userId (website/novos usuários)
        const user = await prisma_js_1.default.user.findUnique({
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
            logger_js_1.logger.warn(`[PatientService] Nenhum registro de paciente encontrado para userId: ${userId}. Criando...`);
            try {
                patient = await prisma_js_1.default.patient.create({
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
                });
            }
            catch (createErr) {
                logger_js_1.logger.error(`[PatientService] Falha ao auto-criar paciente:`, createErr);
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
        const [appointments, totalAppointments, completedAppointments, recentLogs, todayMood, activeChallengeCount, riskProfile, dailyNudge] = await Promise.all([
            prisma_js_1.default.appointment.findMany({
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
            prisma_js_1.default.appointment.count({ where: { patientId } }),
            prisma_js_1.default.appointment.count({ where: { patientId, status: 'COMPLETED' } }),
            prisma_js_1.default.healthLog.findMany({
                where: { patientId },
                orderBy: { logDate: 'desc' },
                take: 20
            }),
            prisma_js_1.default.healthLog.findFirst({
                where: {
                    patientId,
                    type: 'MOOD',
                    logDate: { gte: startOfToday }
                }
            }),
            prisma_js_1.default.patientChallenge.count({
                where: { patientId, status: 'ACTIVE' }
            }),
            intelligence_service_js_1.intelligenceService.analyzeRiskProfile(patientId),
            intelligence_service_js_1.intelligenceService.generateDailyNudge(userId)
        ]);
        // 3. AI Insights (Processamento em paralelo)
        const [isLowDay, weeklyNarrative, actionPlan, insights] = await Promise.all([
            Promise.resolve(aiInsight_service_js_1.aiInsightService.detectLowDay(recentLogs)),
            Promise.resolve(aiInsight_service_js_1.aiInsightService.generateWeeklyNarrative(recentLogs, user.name || 'Paciente')),
            aiInsight_service_js_1.aiInsightService.generateDailyActions({ ...patient, user: { name: user.name } }, aiInsight_service_js_1.aiInsightService.detectLowDay(recentLogs)),
            aiInsight_service_js_1.aiInsightService.generatePatientInsights(userId)
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
                if (appt.status === 'COMPLETED')
                    entry.concluidas += 1;
            }
        });
        const chartMonthsData = Array.from(monthsMap.values())
            .sort((a, b) => a.sortDate - b.sortDate)
            .map(({ sortDate, ...rest }) => rest);
        const onlineCount = appointments.filter(a => a.isOnline).length;
        const inPersonCount = appointments.length - onlineCount;
        // Próximo agendamento
        const nextAppointment = appointments.find(a => new Date(a.dateTime) > now && (a.status === 'SCHEDULED' || a.status === 'CONFIRMED'));
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
    async invalidateDashboard(userId) {
        const key = cache_service_js_1.CacheService.generateKey('PatientService', 'getDashboardData', { args: [userId] });
        await cache_service_js_1.cacheService.delete(key);
        logger_js_1.logger.info(`[PatientService] Cache invalidated for user ${userId}`);
    }
}
exports.PatientService = PatientService;
__decorate([
    (0, cache_service_js_1.Cacheable)({ ttl: 300, tags: ['patient', 'dashboard'] })
], PatientService.prototype, "getDashboardData", null);
exports.patientService = new PatientService();
//# sourceMappingURL=patient.service.js.map