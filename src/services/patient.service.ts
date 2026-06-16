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
                Person: {
                    select: {
                        Patient: {
                            select: {
                                id: true, userId: true, healthPoints: true, experiencePoints: true, level: true, levelTitle: true, levelTier: true, currentStreak: true, onboardingCompleted: true,
                                subscriptions: { where: { status: 'ACTIVE' }, include: { plan: { select: { name: true } } }, take: 1 }
                            }
                        }
                    }
                },
                Patient: {
                    select: {
                        id: true, userId: true, healthPoints: true, experiencePoints: true, level: true, levelTitle: true, levelTier: true, currentStreak: true, onboardingCompleted: true,
                        subscriptions: { where: { status: 'ACTIVE' }, include: { plan: { select: { name: true } } }, take: 1 }
                    }
                }
            }
        });

        // Prioridade: person.patient (backend legado) → patient direto (website/novo registro)
        // @ts-ignore - Prisma relation naming mismatch
        let patient = user?.Person?.Patient ?? user?.Patient ?? null;

        if (!patient) {
            // Último recurso: auto-criar registro de paciente para não deslogar o usuário
            logger.warn(`[PatientService] Nenhum registro de paciente encontrado para userId: ${userId}. Criando...`);
            try {
                patient = await prisma.patient.create({
                    data: {
                        User: { connect: { id: userId } },
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

        // 2. Fetch de Dados em Paralelo (Prisma Core + IA Rápida)
        const [
            appointments,
            totalAppointments,
            completedAppointments,
            recentLogs,
            todayMood,
            activeChallengeCount,
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
                    Partner: {
                        select: {
                            User: { select: { name: true, avatar: true } },
                            specialty: true,
                            name: true,
                        },
                    },
                },
                orderBy: { dateTime: 'asc' }
            }),
            prisma.appointment.count({ where: { patientId } }),
            prisma.appointment.count({ where: { patientId, status: 'COMPLETED' } }),
            prisma.healthLog.findMany({
                where: { patientId },
                orderBy: { logDate: 'desc' },
                take: 15 // Reduzido de 20 para 15 para ganho de performance
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
            intelligenceService.generateDailyNudge(userId)
        ]);

        // 3. IA Lenta -> Disparar em Background (ou com cache curto)
        // Reduzimos o bloqueio de requisição esperando apenas o que é essencial
        const riskProfilePromise = intelligenceService.analyzeRiskProfile(patientId);
        const insightsPromise = aiInsightService.generatePatientInsights(userId);

        // Aguardamos as narrativas rápidas, mas deixamos os insights pesados para o final ou cache
        const [isLowDay, weeklyNarrative, actionPlan] = await Promise.all([
            Promise.resolve(aiInsightService.detectLowDay(recentLogs)),
            Promise.resolve(aiInsightService.generateWeeklyNarrative(recentLogs, user.name || 'Paciente')),
            aiInsightService.generateDailyActions({ ...patient, user: { name: user.name } } as any, false) // Cache/Default
        ]);

        // Resolver insights e risco no final do Promise.all de retorno se necessário,
        // ou retornar o que já temos agora para máxima velocidade.
        const [riskProfile, insights] = await Promise.all([riskProfilePromise, insightsPromise]);

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
                Plan: (patient as any).subscriptions?.[0]?.plan?.name || 'Gratuito'
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
     * Helper to ensure a Patient record exists for a given userId
     */
    public async ensurePatient(userId: string) {
      // 1. Try to find via direct patient relation first
      let patient = await prisma.patient.findUnique({
        where: { userId },
      });

      if (patient) return patient;

      // 2. Try via person relation if available
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { personId: true },
      });

      if (user?.personId) {
        patient = await prisma.patient.findUnique({
          where: { personId: user.personId },
        });
        if (patient) return patient;
      }

      // 3. Create a new patient record
      console.log(`[PatientService] Creating missing Patient record for userId: ${userId}`);
      patient = await prisma.patient.create({
        data: {
          User: { connect: { id: userId } },
          ...(user?.personId ? { Person: { connect: { id: user.personId } } } : {}),
          archetype: 'GENERAL',
          healthPoints: 0,
          experiencePoints: 0,
          level: 1,
          onboardingCompleted: false
        },
      });

      return patient;
    }

    /**
     * Obtém a timeline médica consolidada do paciente
     */
    @Cacheable({ ttl: 60, tags: ['patient', 'timeline'] })
  async getMedicalTimeline(userId: string) {
    try {
      // Step 1: Ensure Patient record exists
      const patient = await this.ensurePatient(userId);
      
      const patientId = patient.id;

      // Step 3: Fetch all events in parallel
      const [
        appointments,
        exams,
        histories,
        anamneses,
        prescriptions
      ] = await Promise.all([
        prisma.appointment.findMany({
          where: { patientId },
          select: {
            id: true,
            dateTime: true,
            status: true,
            notes: true,
            Partner: {
              select: {
                specialty: true,
                name: true,
                User: { select: { name: true, avatar: true } },
              },
            },
          },
          orderBy: { dateTime: 'desc' },
          take: 50
        }),
        prisma.healthExam.findMany({
          where: { patientId },
          orderBy: { date: 'desc' },
          take: 50
        }),
        prisma.medicalHistory.findMany({
          where: { patientId },
          orderBy: { date: 'desc' },
          take: 50
        }),
        prisma.anamnesis.findMany({
          where: { patientId },
          orderBy: { date: 'desc' },
          take: 50
        }),
        prisma.prescription.findMany({
          where: { patientId },
          select: {
            id: true,
            date: true,
            status: true,
            medication: true,
            attachments: true,
            doctor: true,
            Partner: {
              select: {
                User: { select: { name: true } },
                name: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          take: 50
        })
      ]);

      // Step 4: Normalize and combine events
      const timelineEvents = [
        ...appointments.map(a => ({
          id: a.id,
          date: a.dateTime,
          type: 'APPOINTMENT',
          title: `Consulta com ${a.Partner?.User?.name || a.Partner?.name || 'Profissional'}`,
          description: a.notes || 'Consulta realizada',
          status: a.status,
          category: a.Partner?.specialty || 'Geral',
          icon: 'Calendar',
          partner: a.Partner?.User?.name || a.Partner?.name,
          avatar: a.Partner?.User?.avatar
        })),
        ...exams.map(e => ({
          id: e.id,
          date: e.date,
          type: 'EXAM',
          title: e.name,
          description: `${e.type} - ${e.laboratory || 'Laboratório não informado'}`,
          status: e.status,
          category: e.type,
          urgency: e.urgency,
          icon: 'Activity',
          attachments: e.attachments
        })),
        ...histories.map(h => ({
          id: h.id,
          date: h.date,
          type: 'HISTORY',
          title: `Registro Histórico: ${h.type}`,
          description: h.description,
          status: h.status,
          category: h.specialty,
          icon: 'FileText',
          attachments: h.attachments
        })),
        ...anamneses.map(an => ({
          id: an.id,
          date: an.date,
          type: 'ANAMNESIS',
          title: 'Avaliação Clínica / Anamnese',
          description: an.chiefComplaint,
          status: 'Concluído',
          category: an.specialty || 'Clínica Médica',
          icon: 'Stethoscope',
          attachments: an.attachments,
          doctor: an.doctorName
        })),
        ...prescriptions.map(p => ({
          id: p.id,
          date: p.date,
          type: 'PRESCRIPTION',
          title: 'Nova Prescrição Médica',
          description: p.medication || 'Medicação prescrita',
          status: p.status,
          category: 'Medicação',
          icon: 'Pill',
          attachments: p.attachments,
          doctor: p.Partner?.User?.name || p.Partner?.name || p.doctor
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return timelineEvents;
    } catch (error) {
      console.error('[PatientService] Error fetching medical timeline:', error);
      return [];
    }
  }

    /**
     * Invalida o cache do Dashboard para um usuário
     */
    async invalidateDashboardCache(userId: string) {
        const key = CacheService.generateKey('PatientService', 'getDashboardData', { args: [userId] });
        await cacheService.delete(key);
        logger.info(`[PatientService] Dashboard cache invalidated for user ${userId}`);
    }

    /**
     * Invalida o cache da timeline para um usuário
     */
    async invalidateTimeline(userId: string) {
        const key = CacheService.generateKey('PatientService', 'getMedicalTimeline', { args: [userId] });
        await cacheService.delete(key);
        logger.info(`[PatientService] Timeline cache invalidated for user ${userId}`);
    }
}

export const patientService = new PatientService();

