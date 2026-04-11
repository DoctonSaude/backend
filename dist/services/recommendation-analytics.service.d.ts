/**
 * PROJETO CÉREBRO - ANALYTICS E MÉTRICAS
 * Sistema de tracking e análise de performance das recomendações
 * Métricas de sucesso para validar efetividade da personalização
 */
export interface InteractionEvent {
    id: string;
    user_id: string;
    content_id: string;
    interaction_type: 'view' | 'click' | 'complete' | 'skip' | 'save' | 'share';
    context: 'home' | 'post_challenge' | 'discover';
    position: number;
    score: number;
    applied_rules: string[];
    session_id: string;
    timestamp: string;
    user_segment?: string;
    content_type?: string;
    recommendation_engine_version?: string;
    time_to_click?: number;
    time_spent?: number;
}
export interface RecommendationMetrics {
    adoption_rate: number;
    conversion_rate: number;
    retention_impact: {
        day_7: number;
        day_30: number;
        day_90: number;
    };
    click_through_rate: number;
    completion_rate: number;
    avg_position_clicked: number;
    user_satisfaction: number;
    diversity_score: number;
    novelty_score: number;
    engagement_lift: number;
    session_duration_impact: number;
    feature_adoption: number;
}
export interface ABTestResult {
    test_id: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: 'running' | 'completed' | 'paused';
    variants: {
        control: {
            name: string;
            description: string;
            users: number;
            metrics: RecommendationMetrics;
        };
        treatment: {
            name: string;
            description: string;
            users: number;
            metrics: RecommendationMetrics;
        };
    };
    statistical_significance: number;
    winner?: 'control' | 'treatment' | 'inconclusive';
    confidence_level: number;
}
export declare class RecommendationAnalyticsService {
    /**
     * Registra interação do usuário com recomendação
     */
    logInteraction(data: Omit<InteractionEvent, 'id' | 'timestamp'>): Promise<void>;
    /**
     * Calcula métricas de performance das recomendações
     */
    calculateMetrics(startDate: string, endDate: string, filters?: {
        context?: string;
        user_segment?: string;
        content_type?: string;
        engine_version?: string;
    }): Promise<RecommendationMetrics>;
    /**
     * Executa teste A/B entre diferentes estratégias de recomendação
     */
    runABTest(testConfig: {
        name: string;
        description: string;
        control_strategy: string;
        treatment_strategy: string;
        duration_days: number;
        traffic_split: number;
        success_metric: keyof RecommendationMetrics;
        minimum_effect_size: number;
    }): Promise<string>;
    /**
     * Analisa resultados de teste A/B
     */
    analyzeABTest(testId: string): Promise<ABTestResult>;
    /**
     * Gera relatório de performance das recomendações
     */
    generatePerformanceReport(startDate: string, endDate: string): Promise<{
        period: string;
        overall_metrics: RecommendationMetrics;
        by_context: Record<string, RecommendationMetrics>;
        by_user_segment: Record<string, RecommendationMetrics>;
        top_performing_rules: Array<{
            rule_id: string;
            rule_name: string;
            interactions: number;
            ctr: number;
            conversion_rate: number;
        }>;
        content_insights: {
            most_recommended: Array<{
                content_id: string;
                title: string;
                recommendations: number;
                ctr: number;
            }>;
            highest_engagement: Array<{
                content_id: string;
                title: string;
                completion_rate: number;
                avg_rating: number;
            }>;
        };
        recommendations: string[];
    }>;
    /**
     * Monitora métricas em tempo real
     */
    getRealtimeMetrics(): Promise<{
        active_users: number;
        recommendations_served: number;
        current_ctr: number;
        avg_response_time: number;
        error_rate: number;
        top_content: Array<{
            content_id: string;
            views: number;
        }>;
    }>;
    private calculateAveragePosition;
    private calculateDiversityScore;
    private calculateNoveltyScore;
    private calculateRetentionImpact;
    private calculateUserSatisfaction;
    private calculateEngagementLift;
    private calculateSessionImpact;
    private calculateFeatureAdoption;
    private calculateStatisticalSignificance;
    private generateRecommendations;
    private getTopContent;
    private saveInteractionEvent;
    private processRealTimeMetrics;
    private getInteractions;
    private getUserSegments;
    private getTopPerformingRules;
    private getContentInsights;
    private saveABTest;
    private getABTest;
    private countTestUsers;
    private getAverageResponseTime;
    private getErrorRate;
}
export default RecommendationAnalyticsService;
//# sourceMappingURL=recommendation-analytics.service.d.ts.map