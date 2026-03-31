/**
 * JOBS NPS - ANÁLISE AUTOMÁTICA E RELATÓRIOS
 * Automatização da análise de feedback e geração de insights
 */
export declare class NPSAnalysisJobs {
    private static npsService;
    private static jobs;
    /**
     * Inicia todos os jobs de análise NPS
     */
    static startAllJobs(): void;
    /**
     * Para todos os jobs
     */
    static stopAllJobs(): void;
    /**
     * JOB 1: Relatório "Voz do Cliente" (Quinzenal - Segundas 08:00)
     */
    private static startVoiceOfCustomerReportJob;
    /**
     * JOB 2: Análise diária de NPS (Diário - 07:00)
     */
    private static startDailyNPSAnalysisJob;
    /**
     * JOB 3: Alerta de detratores críticos (A cada 2 horas durante horário comercial)
     */
    private static startDetractorAlertJob;
    /**
     * JOB 4: Análise de tendências semanais (Domingos - 20:00)
     */
    private static startWeeklyTrendAnalysisJob;
    /**
     * JOB 5: Relatório executivo mensal (Primeiro dia do mês - 09:00)
     */
    private static startMonthlyExecutiveReportJob;
    private static calculateDailyMetrics;
    private static checkNPSAlerts;
    private static saveDailyMetrics;
    private static getCriticalDetractors;
    private static alertCriticalDetractors;
    private static analyzeWeeklyTrends;
    private static generateTrendInsights;
    private static generateExecutiveReport;
    private static notifyLeadershipTeam;
    private static notifyProductTeam;
    private static sendExecutiveReport;
    private static sendAlert;
    /**
     * Status dos jobs
     */
    static getJobsStatus(): any;
    /**
     * Executar job manualmente (para testes)
     */
    static runJobManually(jobName: string): Promise<void>;
}
export default NPSAnalysisJobs;
//# sourceMappingURL=nps-analysis.job.d.ts.map