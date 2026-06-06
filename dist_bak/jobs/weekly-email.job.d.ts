/**
 * Job para enviar e-mails semanais de aquecimento
 * Executa toda segunda-feira às 09:00
 */
export declare const startWeeklyEmailJob: () => void;
/**
 * Job para enviar lembretes de streak em risco
 * Executa todo dia às 20:00
 */
export declare const startStreakReminderJob: () => void;
/**
 * Job para notificações de desafio em destaque
 * Executa todo dia às 08:00
 */
export declare const startFeaturedChallengeJob: () => void;
/**
 * Iniciar todos os cron jobs
 */
export declare const startAllCronJobs: () => void;
declare const _default: {
    startWeeklyEmailJob: () => void;
    startStreakReminderJob: () => void;
    startFeaturedChallengeJob: () => void;
    startAllCronJobs: () => void;
};
export default _default;
//# sourceMappingURL=weekly-email.job.d.ts.map