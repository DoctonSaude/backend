/**
 * SERVIÇO DE PREVENÇÃO DE CHURN - ESTRATÉGIA IMUNOLOGIA DO CLIENTE
 * Implementa as 3 fases: Diagnóstico, Prevenção e Tratamento
 */
export interface ExitSurveyData {
    userId: string;
    primaryReason: 'price' | 'lack_of_use' | 'technical_issues' | 'goal_achieved' | 'competitor' | 'life_change' | 'other';
    secondaryReasons: string[];
    feedback: string;
    likelihood: number;
    timestamp: string;
    planName: string;
    userAgent: string;
    sessionDuration: number;
}
export interface HealthScore {
    userId: string;
    score: number;
    factors: {
        loginFrequency: number;
        challengeParticipation: number;
        featureUsage: number;
        socialEngagement: number;
        goalProgress: number;
    };
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    lastCalculated: string;
    recommendations: string[];
}
export interface ChurnRiskUser {
    userId: string;
    userName: string;
    email: string;
    planName: string;
    healthScore: number;
    riskLevel: string;
    daysSinceLastLogin: number;
    interventionsSent: number;
    lastInterventionDate?: string;
    predictedChurnDate: string;
}
export declare class ChurnPreventionService {
    /**
     * Salva dados do Exit Survey quando usuário cancela
     */
    saveExitSurvey(data: ExitSurveyData): Promise<void>;
    /**
     * Analisa comportamento pré-churn dos últimos 30 dias
     */
    analyzePreChurnBehavior(userId: string): Promise<any>;
    /**
     * Calcula Health Score do usuário (0-100)
     */
    calculateHealthScore(userId: string): Promise<HealthScore>;
    /**
     * Identifica usuários em risco de churn
     */
    identifyAtRiskUsers(): Promise<ChurnRiskUser[]>;
    /**
     * Executa campanhas de reativação para usuários inativos
     */
    executeReactivationCampaigns(): Promise<void>;
    /**
     * Processo de resgate no momento do cancelamento
     */
    executeRetentionFlow(userId: string, reason: string): Promise<any>;
    /**
     * Executa intervenções proativas baseadas no Health Score
     */
    executeProactiveInterventions(): Promise<void>;
    private calculateLoginFrequency;
    private calculateChallengeParticipation;
    private calculateFeatureUsage;
    private calculateSocialEngagement;
    private calculateGoalProgress;
    private determineRiskLevel;
    private generateRecommendations;
    private predictChurnDate;
    private generatePersonalizedMessage;
    private generateRetentionOffer;
    private getPersonalizedRetentionReason;
    /**
     * Gera uma mensagem de retenção amigável para exibição no fluxo de cancelamento
     */
    private generateRetentionMessage;
    private getLoginCount;
    private getChallengeParticipationRate;
    private getUniqueFeatureUsage;
    private getSocialActionCount;
    private getGoalCompletionRate;
    /**
     * Métodos auxiliares usados pela análise de comportamento pré-churn
     * (implementações mockadas para evitar erros de build)
     */
    private getLoginFrequency;
    private getChallengeParticipation;
    private getFeatureUsage;
    private getSupportTickets;
    private getLastActiveDate;
    private identifyWarningSignals;
    getAllActiveUsers(): Promise<any[]>;
    private getDaysSinceLastLogin;
    private getInterventionCount;
    private getLastInterventionDate;
    private daysSince;
    private sendToAnalytics;
    private notifyProductTeam;
    private scheduleWinBackCampaign;
    private getUserById;
    private getInactiveUsers;
    private sendReactivationEmail;
    private sendPushNotification;
    private logIntervention;
    private selectIntervention;
    private executeIntervention;
    private getRecommendedChallenges;
}
export default ChurnPreventionService;
//# sourceMappingURL=churn-prevention.service.d.ts.map