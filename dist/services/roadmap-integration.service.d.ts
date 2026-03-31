/**
 * SERVIÇO DE INTEGRAÇÃO COM ROADMAP
 * FASE 3: Transforma insights NPS em ações concretas no roadmap
 */
export interface CustomerVoiceInitiative {
    id: string;
    title: string;
    description: string;
    source: {
        reportId: string;
        npsTheme: string;
        affectedUsers: number;
        businessImpact: 'REVENUE' | 'RETENTION' | 'ACQUISITION' | 'SATISFACTION';
        originalFeedbacks: string[];
    };
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    impactScore: number;
    effortScore: number;
    owner: 'Head de Produto' | 'Head de Engenharia' | 'Head de Marketing' | 'Head de CS';
    assignee?: string;
    status: 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';
    createdAt: string;
    dueDate: string;
    completedAt?: string;
    successMetric: string;
    baselineValue?: number;
    targetValue?: number;
    actualValue?: number;
    communicationPlan: {
        channels: ('email' | 'in-app' | 'release-notes' | 'social')[];
        message: string;
        scheduledDate: string;
    };
    labels: string[];
    epic?: string;
}
export interface ActionDecisionFramework {
    insight: string;
    category: 'BUG' | 'FEATURE' | 'UX' | 'PERFORMANCE' | 'CONTENT' | 'PRICING';
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    effort: 'LOW' | 'MEDIUM' | 'HIGH';
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    owner: string;
    timeline: string;
    successMetric: string;
}
export interface RoadmapMetrics {
    totalInitiatives: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    completionRate: number;
    averageTimeToComplete: number;
    impactMeasured: number;
    npsImpact: number;
}
export declare class RoadmapIntegrationService {
    /**
     * Converte insight NPS em ação priorizada
     */
    convertInsightToAction(insight: any): Promise<ActionDecisionFramework>;
    /**
     * Cria iniciativa da voz do cliente
     */
    createCustomerVoiceInitiative(data: Partial<CustomerVoiceInitiative>): Promise<CustomerVoiceInitiative>;
    /**
     * Cria múltiplas tarefas baseadas em relatório NPS
     */
    createTasksFromNPSReport(report: any): Promise<CustomerVoiceInitiative[]>;
    /**
     * Atualiza status de uma iniciativa
     */
    updateInitiativeStatus(initiativeId: string, status: CustomerVoiceInitiative['status'], notes?: string): Promise<void>;
    /**
     * Mede impacto de uma iniciativa completada
     */
    measureImpact(initiative: CustomerVoiceInitiative): Promise<void>;
    /**
     * Gera métricas do roadmap
     */
    getRoadmapMetrics(): Promise<RoadmapMetrics>;
    /**
     * Busca iniciativas por filtros
     */
    getInitiatives(filters?: {
        status?: string;
        priority?: string;
        owner?: string;
        epic?: string;
    }): Promise<CustomerVoiceInitiative[]>;
    private categorizeInsight;
    private calculateImpact;
    private estimateEffort;
    private calculatePriority;
    private assignOwner;
    private estimateTimeline;
    private defineSuccessMetric;
    private generateTaskDescription;
    private mapPriority;
    private calculateAffectedUsers;
    private identifyBusinessImpact;
    private extractOriginalFeedbacks;
    private saveToProjectManagement;
    private notifyOwner;
    private getInitiativeById;
    private getAllCustomerVoiceInitiatives;
    private groupByStatus;
    private groupByPriority;
    private calculateCompletionRate;
    private calculateAverageTime;
    private calculateNPSImpact;
    private calculateDueDate;
    private calculateImpactScore;
    private estimateEffortScore;
    private generateSuccessMetric;
    private generateCommunicationPlan;
    private notifyStatusChange;
    private getMetricsBeforeImplementation;
    private getMetricsAfterImplementation;
    private calculateRealImpact;
    private prepareFeedbackCommunication;
}
export default RoadmapIntegrationService;
//# sourceMappingURL=roadmap-integration.service.d.ts.map