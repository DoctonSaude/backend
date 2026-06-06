/**
 * SISTEMA NPS - MÁQUINA DE FEEDBACK ESTRATÉGICO
 * FASE 1: COLETA INTELIGENTE
 * Transforma voz do cliente em ações concretas no roadmap
 */
export interface NPSResponse {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    planType: string;
    daysSinceSignup: number;
    score: number;
    category: 'DETRACTOR' | 'NEUTRAL' | 'PROMOTER';
    qualitativeFeedback: string;
    tags: string[];
    triggerContext: string;
    timestamp: string;
    processed: boolean;
    actionTaken?: string;
}
export interface NPSAnalytics {
    period: string;
    totalResponses: number;
    npsScore: number;
    previousScore?: number;
    trend: number;
    distribution: {
        promoters: number;
        neutrals: number;
        detractors: number;
    };
    topDetractorThemes: Array<{
        theme: string;
        count: number;
        percentage: number;
    }>;
    topPromoterThemes: Array<{
        theme: string;
        count: number;
        percentage: number;
    }>;
    topFeatureRequests: Array<{
        feature: string;
        count: number;
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
    responseRate: number;
}
export interface VoiceOfCustomerReport {
    reportId: string;
    period: string;
    generatedAt: string;
    npsScore: number;
    trend: string;
    keyInsights: {
        topDetractorThemes: string[];
        topPromoterThemes: string[];
        urgentIssues: string[];
        featureRequests: string[];
    };
    recommendedActions: Array<{
        priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
        action: string;
        owner: string;
        estimatedImpact: string;
    }>;
    roadmapInfluence: {
        newItems: number;
        priorityChanges: number;
        bugFixes: number;
    };
}
export interface KeyInsights {
    topDetractorThemes: string[];
    topPromoterThemes: string[];
    urgentIssues: string[];
    featureRequests: string[];
    detractorCount: number;
    promoterCount: number;
    neutralCount: number;
}
export interface RecommendedAction {
    priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    owner: string;
    estimatedImpact: string;
}
export interface UserInfo {
    id: string;
    createdAt: Date;
    name: string;
    email: string;
    planType: string;
}
export interface ProjectTask {
    title: string;
    description: string;
    priority: string;
    assignee: string;
    dueDate?: string | Date;
    labels?: string[];
    tags?: string[];
    source?: string;
}
export declare class NPSFeedbackService {
    private readonly TAGS;
    /**
     * FASE 1: COLETA INTELIGENTE
     * Verifica se usuário é elegível para pesquisa NPS
     */
    isEligibleForNPS(userId: string): Promise<boolean>;
    /**
     * Salva resposta NPS com análise automática
     */
    saveNPSResponse(data: Partial<NPSResponse>): Promise<NPSResponse>;
    /**
     * FASE 2: ANÁLISE E SÍNTESE
     * Gera relatório quinzenal "Voz do Cliente"
     */
    generateVoiceOfCustomerReport(days?: number): Promise<VoiceOfCustomerReport>;
    /**
     * FASE 3: AÇÃO E INTEGRAÇÃO ROADMAP
     * Cria tarefas baseadas no feedback
     */
    createRoadmapItems(report: VoiceOfCustomerReport): Promise<void>;
    /**
     * FASE 4: FECHAMENTO DO LOOP
     * Comunica melhorias implementadas
     */
    generateImprovementCommunication(implementedFeatures: string[]): Promise<string>;
    private categorizeScore;
    private autoTagFeedback;
    private extractKeyInsights;
    private getTopThemes;
    private extractFeatureRequests;
    private generateRecommendedActions;
    private getUserById;
    private getDaysSinceSignup;
    private getDaysSince;
    private getLastNPSResponse;
    private saveToDatabase;
    private notifyTeamCriticalDetractor;
    private schedulePersonalOutreach;
    private getNPSResponsesSince;
    private calculateNPSAnalytics;
    private saveReport;
    private notifyLeadershipTeam;
    private createProjectTask;
    private calculateDueDate;
}
export default NPSFeedbackService;
//# sourceMappingURL=nps-feedback.service.d.ts.map