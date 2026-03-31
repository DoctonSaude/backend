/**
 * PROJETO CÉREBRO - FASE 3: JOBS DE TREINO CONTÍNUO
 * Sistema automatizado para treino, avaliação e deploy de modelos ML
 * Execução programada para manter modelos sempre atualizados
 */
export declare class MLTrainingJobs {
    private mlService;
    private mlopsService;
    constructor();
    /**
     * Inicializa todos os jobs de ML
     */
    initializeJobs(): void;
    /**
     * JOB 1: Treino semanal de modelos
     * Execução: Domingo às 01:00
     */
    private runWeeklyModelTraining;
    /**
     * JOB 2: Monitoramento diário de modelos
     * Execução: Diário às 06:00
     */
    private runDailyModelMonitoring;
    /**
     * JOB 3: Avaliação de experimentos A/B
     * Execução: Diário às 09:00
     */
    private evaluateABExperiments;
    /**
     * JOB 4: Retreino automático baseado em drift
     * Execução: A cada 6 horas
     */
    private checkAndRetrain;
    /**
     * JOB 5: Limpeza de modelos antigos
     * Execução: Mensal, dia 1 às 02:00
     */
    private cleanupOldModels;
    /**
     * JOB 6: Relatório semanal de ML
     * Execução: Segunda às 08:00
     */
    private generateMLReport;
    /**
     * JOB 7: Validação de feature store
     * Execução: Diário às 05:00
     */
    private validateFeatureStore;
    private prepareWeeklyTrainingData;
    private getOptimizedHyperparameters;
    private getTopFeatures;
    private selectBestModelForTesting;
    private shouldRetrain;
    private logTrainingMetrics;
    private logTrainingError;
    private evaluateModelPerformance;
    private saveMonitoringResults;
    private sendCriticalAlerts;
    private getActiveABExperiments;
    private collectExperimentMetrics;
    private calculateStatisticalSignificance;
    private makeExperimentDecision;
    private promoteModelToProduction;
    private stopExperiment;
    private updateExperimentStatus;
    private notifyAutoRetraining;
    private archiveOldModels;
    private deleteOldExperiments;
    private cleanupModelArtifacts;
    private logCleanupResults;
    private countProductionModels;
    private countTestingModels;
    private countWeeklyTrainedModels;
    private getAverageModelAccuracy;
    private getAveragePredictionLatency;
    private getTotalPredictionsServed;
    private countActiveExperiments;
    private countCompletedExperiments;
    private countSuccessfulPromotions;
    private getAverageFeatureDrift;
    private getAveragePredictionDrift;
    private getDataQualityScore;
    private countWeeklyAlerts;
    private countCriticalIncidents;
    private generateMLRecommendations;
    private saveMLReport;
    private sendMLReport;
    private getAllFeatureGroups;
    private validateFeatureGroupQuality;
    private validateFeatureGroupSchema;
    private validateDataFreshness;
    private reportDataQualityIssue;
    private reportSchemaViolation;
    private reportFreshnessIssue;
    private autoFixFeatureGroupIssues;
    private logFeatureStoreValidation;
    private sendFeatureStoreAlerts;
}
export declare const mlTrainingJobs: MLTrainingJobs;
//# sourceMappingURL=ml-training.job.d.ts.map