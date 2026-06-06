"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAllCronJobs = exports.startFeaturedChallengeJob = exports.startStreakReminderJob = exports.startWeeklyEmailJob = void 0;
// @ts-nocheck
const node_cron_1 = __importDefault(require("node-cron"));
const email_service_1 = __importDefault(require("../services/email.service"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const gamification_service_1 = require("../services/gamification.service");
/**
 * Job para enviar e-mails semanais de aquecimento
 * Executa toda segunda-feira às 09:00
 */
const startWeeklyEmailJob = () => {
    // Cron: Segunda-feira às 09:00
    node_cron_1.default.schedule('0 9 * * 1', async () => {
        console.log('🚀 [Cron Job] Iniciando envio de e-mails semanais...');
        try {
            const patients = await prisma_1.default.patient.findMany({
                include: {
                    user: true,
                    patientChallenges: true
                }
            });
            const emailsSent = [];
            // Buscar desafio em destaque
            const featuredChallenge = await prisma_1.default.challenge.findFirst({
                where: { isActive: true }
            });
            for (const patient of patients) {
                try {
                    if (!patient.user || !patient.user.email)
                        continue;
                    // Buscar dados do paciente
                    const userData = {
                        name: patient.user.name || 'Paciente',
                        email: patient.user.email,
                        healthPoints: patient.healthPoints,
                        level: patient.level,
                        currentStreak: patient.currentStreak
                    };
                    // Buscar desafios recomendados (Async agora)
                    const recommended = await (0, gamification_service_1.getRecommendedChallenges)(patient);
                    // Calcular progresso semanal (simplificado: total de desafios iniciados/completados)
                    // Idealmente filtraria por data, mas mantendo lógica original de 'quantidade'
                    const weeklyProgress = patient.patientChallenges.length;
                    // Enviar e-mail
                    await email_service_1.default.sendWeeklyWarmupEmail(userData, {
                        healthPoints: patient.healthPoints,
                        level: patient.level,
                        currentStreak: patient.currentStreak,
                        featuredChallenge: featuredChallenge || undefined,
                        recommendedChallenges: recommended.slice(0, 3),
                        weeklyProgress,
                        completedChallenges: patient.patientChallenges.filter(pc => pc.status === 'COMPLETED').length,
                        unlockedBadges: 0 // TODO: Calcular badges desbloqueados na semana
                    });
                    emailsSent.push(patient.id);
                    // Delay de 200ms entre e-mails
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                catch (error) {
                    console.error(`Erro ao enviar e-mail para paciente ${patient.id}:`, error);
                }
            }
            console.log(`✅ [Cron Job] E-mails semanais enviados: ${emailsSent.length}/${patients.length}`);
        }
        catch (error) {
            console.error('❌ [Cron Job] Erro ao enviar e-mails semanais:', error);
        }
    });
    console.log('✅ Cron job de e-mail semanal configurado (Segunda-feira às 09:00)');
};
exports.startWeeklyEmailJob = startWeeklyEmailJob;
/**
 * Job para enviar lembretes de streak em risco
 * Executa todo dia às 20:00
 */
const startStreakReminderJob = () => {
    // Cron: Todo dia às 20:00
    node_cron_1.default.schedule('0 20 * * *', async () => {
        console.log('🔥 [Cron Job] Verificando streaks em risco...');
        try {
            const patients = await prisma_1.default.patient.findMany({
                include: { user: true }
            });
            const now = new Date();
            let remindersCount = 0;
            for (const patient of patients) {
                if (!patient.user || !patient.user.email)
                    continue;
                // Verificar se o paciente não completou nenhum desafio hoje
                // Lógica: lastActiveDate não é hoje
                const lastActive = patient.lastActiveDate ? new Date(patient.lastActiveDate) : now;
                const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
                // Se não está ativo hoje e tem streak > 0
                if (daysSinceActive >= 1 && patient.currentStreak > 0) {
                    const userData = {
                        name: patient.user.name || 'Paciente',
                        email: patient.user.email
                    };
                    await email_service_1.default.sendStreakReminderEmail(userData, patient.currentStreak);
                    remindersCount += 1;
                    // Delay
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            console.log(`✅ [Cron Job] Lembretes de streak enviados: ${remindersCount}`);
        }
        catch (error) {
            console.error('❌ [Cron Job] Erro ao enviar lembretes de streak:', error);
        }
    });
    console.log('✅ Cron job de lembrete de streak configurado (Todo dia às 20:00)');
};
exports.startStreakReminderJob = startStreakReminderJob;
/**
 * Job para notificações de desafio em destaque
 * Executa todo dia às 08:00
 */
const startFeaturedChallengeJob = () => {
    node_cron_1.default.schedule('0 8 * * *', async () => {
        console.log('⭐ [Cron Job] Enviando notificações de desafio em destaque...');
        try {
            // Buscar desafio em destaque
            const featuredChallenge = await prisma_1.default.challenge.findFirst({
                where: { isActive: true }
            });
            if (!featuredChallenge) {
                console.log('Nenhum desafio em destaque encontrado');
                return;
            }
            const patients = await prisma_1.default.patient.findMany();
            // Enviar para todos os pacientes (em produção, filtrar por preferências)
            for (const patient of patients) {
                // Import do notification service seria necessário aqui
                // await notificationService.notifyFeaturedChallenge(patient.userId, featuredChallenge);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.log(`✅ [Cron Job] Notificações de desafio enviadas`);
        }
        catch (error) {
            console.error('❌ [Cron Job] Erro ao enviar notificações:', error);
        }
    });
    console.log('✅ Cron job de desafio em destaque configurado (Todo dia às 08:00)');
};
exports.startFeaturedChallengeJob = startFeaturedChallengeJob;
/**
 * Iniciar todos os cron jobs
 */
const startAllCronJobs = () => {
    console.log('\n🕐 Iniciando Cron Jobs...\n');
    (0, exports.startWeeklyEmailJob)();
    (0, exports.startStreakReminderJob)();
    (0, exports.startFeaturedChallengeJob)();
    console.log('\n✅ Todos os Cron Jobs iniciados com sucesso!\n');
};
exports.startAllCronJobs = startAllCronJobs;
exports.default = {
    startWeeklyEmailJob: exports.startWeeklyEmailJob,
    startStreakReminderJob: exports.startStreakReminderJob,
    startFeaturedChallengeJob: exports.startFeaturedChallengeJob,
    startAllCronJobs: exports.startAllCronJobs
};
//# sourceMappingURL=weekly-email.job.js.map