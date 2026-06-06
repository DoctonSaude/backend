/**
 * JOBS AUTOMATIZADOS PARA PREVENÇÃO DE CHURN
 * Executa tarefas periódicas das 3 fases da estratégia anti-churn
 */
export declare class ChurnPreventionJobs {
    /**
     * Inicia todos os jobs de prevenção de churn
     */
    static startAllJobs(): void;
    /**
     * Calcula Health Score de todos os usuários diariamente
     * Executa todo dia às 02:00
     */
    private static startHealthScoreCalculation;
    /**
     * Executa campanhas de reativação para usuários inativos
     * Executa toda segunda, quarta e sexta às 09:00
     */
    private static startReactivationCampaigns;
    /**
     * Executa intervenções proativas baseadas no Health Score
     * Executa todo dia às 10:00
     */
    private static startProactiveInterventions;
    /**
     * Otimiza onboarding baseado em dados de ativação
     * Executa toda segunda às 08:00
     */
    private static startOnboardingOptimization;
    /**
     * Análise semanal de churn e tendências
     * Executa toda segunda às 07:00
     */
    private static startChurnAnalysis;
    /**
     * Análise de comportamento pré-churn
     * Executa todo dia às 03:00
     */
    private static startBehaviorAnalysis;
    /**
     * Monitora efetividade das estratégias de retenção
     * Executa todo dia às 16:00
     */
    private static startRetentionMonitoring;
    /**
     * Executa campanhas de win-back para ex-clientes
     * Executa toda terça e quinta às 14:00
     */
    private static startWinBackCampaigns;
    private static notifyCSTeam;
    private static sendDailyHealthScoreReport;
    private static analyzeWeeklyActivation;
    private static identifyOnboardingOptimizations;
    private static sendOnboardingReport;
    private static calculateWeeklyChurnMetrics;
    private static analyzeChurnTrends;
    private static predictNextWeekChurn;
    private static sendExecutiveChurnReport;
    private static getRecentChurns;
    private static saveChurnPattern;
    private static getActiveRetentionOffers;
    private static calculateRetentionEffectiveness;
    private static optimizeRetentionStrategies;
    private static getWinBackEligibleUsers;
    private static generateWinBackOffer;
    private static sendWinBackCampaign;
    /**
     * Para jobs em caso de shutdown
     */
    static stopAllJobs(): void;
}
//# sourceMappingURL=churn-prevention.job.d.ts.map