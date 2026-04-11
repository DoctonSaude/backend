/**
 * PROJETO CÉREBRO - FASE 3: INFRAESTRUTURA MLOPS
 * Pipeline completo para treino, deploy e monitoramento contínuo de modelos ML
 * "Treinar, servir e monitorar modelos em produção de forma contínua"
 */
export interface MLPipeline {
    pipeline_id: string;
    name: string;
    description: string;
    data_source: {
        table: string;
        features: string[];
        target: string;
        filters: Record<string, any>;
    };
    feature_engineering: {
        transformations: string[];
        scaling: 'standard' | 'minmax' | 'robust';
        encoding: 'onehot' | 'label' | 'target';
        feature_selection: 'correlation' | 'mutual_info' | 'rfe';
    };
    model_config: {
        algorithms: string[];
        hyperparameter_tuning: boolean;
        cross_validation: number;
        evaluation_metrics: string[];
    };
    deployment: {
        strategy: 'blue_green' | 'canary' | 'rolling';
        traffic_split: number;
        rollback_threshold: number;
        monitoring_window: number;
    };
    schedule: {
        training_frequency: 'daily' | 'weekly' | 'monthly';
        data_freshness_check: boolean;
        automatic_deployment: boolean;
        performance_threshold: number;
    };
    created_at: string;
    updated_at: string;
    status: 'active' | 'paused' | 'failed';
}
export interface MLExperiment {
    experiment_id: string;
    pipeline_id: string;
    name: string;
    hypothesis: string;
    parameters: Record<string, any>;
    baseline_model: string;
    metrics: Record<string, number>;
    artifacts: string[];
    logs: string[];
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    start_time: string;
    end_time?: string;
    duration_minutes?: number;
    conclusion: string;
    next_steps: string[];
    approved_for_production: boolean;
}
export interface ModelRegistry {
    model_id: string;
    name: string;
    version: string;
    algorithm: string;
    description: string;
    author: string;
    tags: string[];
    metrics: Record<string, number>;
    benchmark_results: Record<string, number>;
    status: 'development' | 'staging' | 'production' | 'archived';
    deployment_date?: string;
    traffic_percentage: number;
    model_path: string;
    config_path: string;
    requirements: string[];
    training_data_version: string;
    parent_experiment: string;
    derived_models: string[];
    created_at: string;
    updated_at: string;
}
export interface FeatureStore {
    feature_group_id: string;
    name: string;
    description: string;
    features: Array<{
        name: string;
        type: 'numerical' | 'categorical' | 'boolean' | 'datetime';
        description: string;
        nullable: boolean;
    }>;
    source_table: string;
    refresh_frequency: 'realtime' | 'hourly' | 'daily';
    transformation_logic: string;
    data_quality_checks: Array<{
        check_type: 'null_check' | 'range_check' | 'uniqueness' | 'freshness';
        parameters: Record<string, any>;
        severity: 'warning' | 'error';
    }>;
    version: string;
    schema_evolution: 'strict' | 'backward_compatible' | 'forward_compatible';
    usage_stats: {
        daily_requests: number;
        unique_consumers: number;
        avg_latency_ms: number;
    };
    created_at: string;
    updated_at: string;
}
export declare class MLOpsPipelineService {
    private mlService;
    private pipelines;
    private experiments;
    private modelRegistry;
    private featureStore;
    constructor();
    /**
     * PIPELINE PRINCIPAL: Treino automático de modelos
     */
    runMLPipeline(pipelineId: string): Promise<string>;
    /**
     * Criar novo pipeline ML
     */
    createPipeline(config: Omit<MLPipeline, 'pipeline_id' | 'created_at' | 'updated_at' | 'status'>): Promise<string>;
    /**
     * Executar experimento A/B com novos modelos
     */
    runABExperiment(config: {
        name: string;
        hypothesis: string;
        baseline_model: string;
        treatment_config: any;
        traffic_split: number;
        duration_days: number;
        success_metrics: string[];
    }): Promise<string>;
    /**
     * Monitoramento contínuo de modelos em produção
     */
    monitorProductionModels(): Promise<{
        healthy_models: number;
        degraded_models: number;
        failed_models: number;
        alerts: Array<{
            model_id: string;
            severity: 'warning' | 'critical';
            message: string;
            timestamp: string;
        }>;
    }>;
    /**
     * Feature Store: Gerenciar features para ML
     */
    createFeatureGroup(config: Omit<FeatureStore, 'feature_group_id' | 'created_at' | 'updated_at' | 'usage_stats'>): Promise<string>;
    /**
     * Buscar features do Feature Store
     */
    getFeatures(featureGroupId: string, entityIds: string[], featureNames?: string[]): Promise<Record<string, any>[]>;
    /**
     * Retreino automático baseado em performance
     */
    autoRetrain(): Promise<void>;
    private createExperiment;
    private validateDataQuality;
    private prepareFeatures;
    private trainModels;
    private selectBestModel;
    private registerModel;
    private deployModel;
    private generateMockFeatureVector;
    private generateMockFeatureValue;
    private completeExperiment;
    private failExperiment;
    private getCurrentBaselineModel;
    private getDefaultHyperparameters;
    private getModelMetrics;
    private startExperimentTracking;
    private getProductionModels;
    private checkModelHealth;
    private checkPerformanceRegression;
    private saveMonitoringResults;
    private sendCriticalAlerts;
    private validateFeatureQuality;
    private updateFeatureUsageStats;
    private identifyModelsForRetraining;
    private getPipelineForModel;
}
export default MLOpsPipelineService;
//# sourceMappingURL=mlops-pipeline.service.d.ts.map