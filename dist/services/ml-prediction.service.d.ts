/**
 * PROJETO CÉREBRO - FASE 3: MOTOR PREDITIVO
 * Sistema de Machine Learning para predizer probabilidade de engajamento
 * "Antecipando as necessidades" - ML que aprende padrões complexos
 */
export interface MLFeatures {
    user_id: string;
    user_tenure_days: number;
    user_plan_type: 'free' | 'premium' | 'family';
    user_age_group: 'young' | 'adult' | 'senior';
    user_goal: string;
    user_activity_level: 'low' | 'medium' | 'high';
    user_completion_rate: number;
    interactions_last_7d: number;
    interactions_last_30d: number;
    avg_session_duration: number;
    preferred_content_types: string[];
    preferred_time_slots: string[];
    streak_current: number;
    streak_max: number;
    item_id: string;
    item_type: string;
    item_category: string;
    item_difficulty: string;
    item_duration_minutes: number;
    item_rating_avg: number;
    item_completion_rate: number;
    item_popularity_score: number;
    item_recency_days: number;
    context_time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
    context_day_of_week: 'weekday' | 'weekend';
    context_device_type: 'mobile' | 'desktop' | 'tablet';
    context_session_position: number;
    context_previous_action: string;
    collaborative_score: number;
    similar_users_engagement: number;
    item_similarity_score: number;
    time_since_last_interaction: number;
    time_since_similar_content: number;
    seasonal_trend: number;
    content_sequence_position: number;
    progression_level: number;
    difficulty_progression: number;
}
export interface MLPrediction {
    item_id: string;
    predicted_probability: number;
    confidence_interval: [number, number];
    feature_importance: Record<string, number>;
    model_version: string;
    prediction_timestamp: string;
    top_positive_features: Array<{
        feature: string;
        impact: number;
        value: any;
    }>;
    top_negative_features: Array<{
        feature: string;
        impact: number;
        value: any;
    }>;
    reasoning: string;
}
export interface ModelMetrics {
    model_id: string;
    model_version: string;
    algorithm: 'logistic_regression' | 'gradient_boosting' | 'neural_network' | 'ensemble';
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    auc_roc: number;
    click_through_rate_lift: number;
    conversion_rate_lift: number;
    user_satisfaction_impact: number;
    feature_drift: number;
    prediction_drift: number;
    data_quality_score: number;
    training_date: string;
    evaluation_date: string;
    samples_count: number;
}
export interface ModelConfig {
    algorithm: string;
    hyperparameters: Record<string, any>;
    feature_selection: string[];
    target_variable: string;
    validation_strategy: 'time_split' | 'random_split' | 'user_split';
    training_window_days: number;
    retraining_frequency: 'daily' | 'weekly' | 'monthly';
}
export declare class MLPredictionService {
    private models;
    private featureStore;
    private modelMetrics;
    /**
     * MÉTODO PRINCIPAL: Gerar predições ML para recomendações
     */
    generateMLPredictions(userId: string, candidateItems: string[], context: any): Promise<MLPrediction[]>;
    /**
     * Treinar novo modelo com dados recentes
     */
    trainModel(config: ModelConfig): Promise<string>;
    /**
     * Avaliar modelo em produção (A/B testing)
     */
    deployModelForTesting(modelId: string, trafficPercentage?: number): Promise<string>;
    /**
     * Monitorar drift do modelo em produção
     */
    monitorModelDrift(): Promise<{
        feature_drift: number;
        prediction_drift: number;
        data_quality: number;
        alerts: string[];
    }>;
    /**
     * Retreinar modelo automaticamente
     */
    autoRetrain(): Promise<string | null>;
    private extractUserFeatures;
    private extractContextFeatures;
    private extractItemFeatures;
    private extractCollaborativeFeatures;
    private predictEngagementProbability;
    private trainAlgorithm;
    private trainLogisticRegression;
    private trainGradientBoosting;
    private trainNeuralNetwork;
    private trainEnsemble;
    private prepareTrainingData;
    private generateMockFeatures;
    private splitData;
    private evaluateModel;
    private getFallbackPredictions;
    private saveModel;
    private saveModelMetrics;
    private getCurrentProductionModel;
    private configureTrafficSplitting;
    private startMetricsCollection;
    private getRecentProductionData;
    private calculateFeatureDrift;
    private calculatePredictionDrift;
    private assessDataQuality;
    private saveMonitoringMetrics;
    private sendDriftAlerts;
    private getCurrentModelConfig;
    private compareModelPerformance;
}
export default MLPredictionService;
//# sourceMappingURL=ml-prediction.service.d.ts.map