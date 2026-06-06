"use strict";
/**
 * PROJETO CÉREBRO - FASE 3: JOBS DE TREINO CONTÍNUO
 * Sistema automatizado para treino, avaliação e deploy de modelos ML
 * Execução programada para manter modelos sempre atualizados
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlTrainingJobs = exports.MLTrainingJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const ml_prediction_service_1 = __importDefault(require("../services/ml-prediction.service"));
const mlops_pipeline_service_1 = __importDefault(require("../services/mlops-pipeline.service"));
class MLTrainingJobs {
    mlService;
    mlopsService;
    constructor() {
        this.mlService = new ml_prediction_service_1.default();
        this.mlopsService = new mlops_pipeline_service_1.default();
    }
    /**
     * Inicializa todos os jobs de ML
     */
    initializeJobs() {
        console.log('🤖 Initializing ML Training Jobs...');
        // Job 1: Treino semanal de modelos (domingo às 01:00)
        node_cron_1.default.schedule('0 1 * * 0', async () => {
            await this.runWeeklyModelTraining();
        });
        // Job 2: Monitoramento diário de modelos (diário às 06:00)
        node_cron_1.default.schedule('0 6 * * *', async () => {
            await this.runDailyModelMonitoring();
        });
        // Job 3: Avaliação de experimentos A/B (diário às 09:00)
        node_cron_1.default.schedule('0 9 * * *', async () => {
            await this.evaluateABExperiments();
        });
        // Job 4: Retreino automático baseado em drift (a cada 6 horas)
        node_cron_1.default.schedule('0 */6 * * *', async () => {
            await this.checkAndRetrain();
        });
        // Job 5: Limpeza de modelos antigos (mensal, dia 1 às 02:00)
        node_cron_1.default.schedule('0 2 1 * *', async () => {
            await this.cleanupOldModels();
        });
        // Job 6: Relatório semanal de ML (segunda às 08:00)
        node_cron_1.default.schedule('0 8 * * 1', async () => {
            await this.generateMLReport();
        });
        // Job 7: Validação de feature store (diário às 05:00)
        node_cron_1.default.schedule('0 5 * * *', async () => {
            await this.validateFeatureStore();
        });
        console.log('✅ ML Training Jobs initialized');
    }
    /**
     * JOB 1: Treino semanal de modelos
     * Execução: Domingo às 01:00
     */
    async runWeeklyModelTraining() {
        const startTime = Date.now();
        console.log('🔄 Starting weekly model training...');
        try {
            // 1. Preparar dados da última semana
            const trainingData = await this.prepareWeeklyTrainingData();
            if (trainingData.samples < 1000) {
                console.log('⚠️ Insufficient training data, skipping this week');
                return;
            }
            // 2. Executar pipeline de treino para cada algoritmo
            const algorithms = ['logistic_regression', 'gradient_boosting', 'neural_network'];
            const trainedModels = [];
            for (const algorithm of algorithms) {
                try {
                    const modelId = await this.mlService.trainModel({
                        algorithm,
                        hyperparameters: await this.getOptimizedHyperparameters(algorithm),
                        feature_selection: await this.getTopFeatures(),
                        target_variable: 'engagement',
                        validation_strategy: 'time_split',
                        training_window_days: 90,
                        retraining_frequency: 'weekly'
                    });
                    trainedModels.push({
                        model_id: modelId,
                        algorithm,
                        training_time: Date.now() - startTime
                    });
                    console.log(`✅ Trained ${algorithm}: ${modelId}`);
                }
                catch (error) {
                    console.error(`❌ Failed to train ${algorithm}:`, error);
                }
            }
            // 3. Selecionar melhor modelo para teste A/B
            if (trainedModels.length > 0) {
                const bestModel = await this.selectBestModelForTesting(trainedModels);
                if (bestModel) {
                    // 4. Iniciar teste A/B com 10% do tráfego
                    await this.mlService.deployModelForTesting(bestModel.model_id, 10);
                    console.log(`🧪 Started A/B test with model: ${bestModel.model_id}`);
                }
            }
            const duration = Date.now() - startTime;
            console.log(`✅ Weekly training completed: ${trainedModels.length} models in ${duration}ms`);
            // 5. Registrar métricas
            await this.logTrainingMetrics('weekly_training', {
                models_trained: trainedModels.length,
                training_duration: duration,
                data_samples: trainingData.samples,
                algorithms_used: algorithms,
                best_model: trainedModels[0]?.model_id
            });
        }
        catch (error) {
            console.error('❌ Error in weekly model training:', error);
            await this.logTrainingError('weekly_training', error);
        }
    }
    /**
     * JOB 2: Monitoramento diário de modelos
     * Execução: Diário às 06:00
     */
    async runDailyModelMonitoring() {
        console.log('📊 Starting daily model monitoring...');
        try {
            // 1. Monitorar todos os modelos em produção
            const monitoringResults = await this.mlopsService.monitorProductionModels();
            // 2. Verificar drift nos modelos
            const driftResults = await this.mlService.monitorModelDrift();
            // 3. Avaliar performance vs baseline
            const performanceResults = await this.evaluateModelPerformance();
            // 4. Gerar alertas se necessário
            const alerts = [
                ...monitoringResults.alerts,
                ...driftResults.alerts.map(alert => ({
                    model_id: 'current_production',
                    severity: 'warning',
                    message: alert,
                    timestamp: new Date().toISOString()
                }))
            ];
            // 5. Salvar resultados do monitoramento
            await this.saveMonitoringResults({
                date: new Date().toISOString().split('T')[0],
                healthy_models: monitoringResults.healthy_models,
                degraded_models: monitoringResults.degraded_models,
                failed_models: monitoringResults.failed_models,
                feature_drift: driftResults.feature_drift,
                prediction_drift: driftResults.prediction_drift,
                data_quality: driftResults.data_quality,
                alerts: alerts.length,
                performance_metrics: performanceResults
            });
            // 6. Enviar alertas críticos
            const criticalAlerts = alerts.filter(a => a.severity === 'critical');
            if (criticalAlerts.length > 0) {
                await this.sendCriticalAlerts(criticalAlerts);
            }
            console.log(`📊 Daily monitoring complete: ${alerts.length} alerts generated`);
        }
        catch (error) {
            console.error('❌ Error in daily model monitoring:', error);
            await this.logTrainingError('daily_monitoring', error);
        }
    }
    /**
     * JOB 3: Avaliação de experimentos A/B
     * Execução: Diário às 09:00
     */
    async evaluateABExperiments() {
        console.log('🧪 Evaluating A/B experiments...');
        try {
            // 1. Buscar experimentos ativos
            const activeExperiments = await this.getActiveABExperiments();
            if (activeExperiments.length === 0) {
                console.log('ℹ️ No active A/B experiments found');
                return;
            }
            for (const experiment of activeExperiments) {
                try {
                    // 2. Coletar métricas do experimento
                    const metrics = await this.collectExperimentMetrics(experiment.experiment_id);
                    // 3. Verificar significância estatística
                    const significance = await this.calculateStatisticalSignificance(metrics);
                    // 4. Decidir se promover, continuar ou parar
                    const decision = await this.makeExperimentDecision(experiment, significance);
                    switch (decision.action) {
                        case 'promote':
                            await this.promoteModelToProduction(experiment.treatment_model);
                            console.log(`🚀 Promoted model to production: ${experiment.treatment_model}`);
                            break;
                        case 'stop':
                            await this.stopExperiment(experiment.experiment_id, decision.reason);
                            console.log(`🛑 Stopped experiment: ${experiment.experiment_id} - ${decision.reason}`);
                            break;
                        case 'continue':
                            console.log(`⏳ Continuing experiment: ${experiment.experiment_id}`);
                            break;
                    }
                    // 5. Atualizar status do experimento
                    await this.updateExperimentStatus(experiment.experiment_id, decision);
                }
                catch (error) {
                    console.error(`❌ Error evaluating experiment ${experiment.experiment_id}:`, error);
                }
            }
            console.log(`✅ Evaluated ${activeExperiments.length} A/B experiments`);
        }
        catch (error) {
            console.error('❌ Error in A/B experiment evaluation:', error);
            await this.logTrainingError('ab_evaluation', error);
        }
    }
    /**
     * JOB 4: Retreino automático baseado em drift
     * Execução: A cada 6 horas
     */
    async checkAndRetrain() {
        console.log('🔍 Checking for model drift and retraining needs...');
        try {
            // 1. Verificar drift nos modelos
            const driftMetrics = await this.mlService.monitorModelDrift();
            // 2. Determinar se retreino é necessário
            const needsRetraining = this.shouldRetrain(driftMetrics);
            if (!needsRetraining.required) {
                console.log(`ℹ️ No retraining needed: ${needsRetraining.reason}`);
                return;
            }
            console.log(`🎯 Retraining required: ${needsRetraining.reason}`);
            // 3. Executar retreino automático
            const newModelId = await this.mlService.autoRetrain();
            if (newModelId) {
                // 4. Iniciar teste A/B com novo modelo
                await this.mlService.deployModelForTesting(newModelId, 15);
                console.log(`✅ Auto-retraining completed: ${newModelId} deployed for testing`);
                // 5. Notificar equipe sobre retreino automático
                await this.notifyAutoRetraining(newModelId, needsRetraining.reason);
            }
        }
        catch (error) {
            console.error('❌ Error in automatic retraining:', error);
            await this.logTrainingError('auto_retrain', error);
        }
    }
    /**
     * JOB 5: Limpeza de modelos antigos
     * Execução: Mensal, dia 1 às 02:00
     */
    async cleanupOldModels() {
        console.log('🧹 Starting model cleanup...');
        try {
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - 3); // Modelos > 3 meses
            const cleanupResults = {
                archived_models: await this.archiveOldModels(cutoffDate),
                deleted_experiments: await this.deleteOldExperiments(cutoffDate),
                cleaned_artifacts: await this.cleanupModelArtifacts(cutoffDate),
                storage_freed_mb: 0
            };
            // Calcular espaço liberado
            cleanupResults.storage_freed_mb =
                cleanupResults.archived_models * 50 + // ~50MB por modelo
                    cleanupResults.deleted_experiments * 10 + // ~10MB por experimento
                    cleanupResults.cleaned_artifacts * 5; // ~5MB por artifact
            console.log(`✅ Model cleanup completed:
        - Archived models: ${cleanupResults.archived_models}
        - Deleted experiments: ${cleanupResults.deleted_experiments}
        - Cleaned artifacts: ${cleanupResults.cleaned_artifacts}
        - Storage freed: ${cleanupResults.storage_freed_mb}MB
      `);
            await this.logCleanupResults(cleanupResults);
        }
        catch (error) {
            console.error('❌ Error in model cleanup:', error);
            await this.logTrainingError('model_cleanup', error);
        }
    }
    /**
     * JOB 6: Relatório semanal de ML
     * Execução: Segunda às 08:00
     */
    async generateMLReport() {
        console.log('📈 Generating weekly ML report...');
        try {
            const report = {
                week_ending: new Date().toISOString().split('T')[0],
                // Estatísticas de modelos
                models_in_production: await this.countProductionModels(),
                models_in_testing: await this.countTestingModels(),
                models_trained_this_week: await this.countWeeklyTrainedModels(),
                // Performance geral
                avg_model_accuracy: await this.getAverageModelAccuracy(),
                avg_prediction_latency: await this.getAveragePredictionLatency(),
                total_predictions_served: await this.getTotalPredictionsServed(),
                // Experimentos A/B
                active_experiments: await this.countActiveExperiments(),
                completed_experiments: await this.countCompletedExperiments(),
                successful_promotions: await this.countSuccessfulPromotions(),
                // Drift e qualidade
                avg_feature_drift: await this.getAverageFeatureDrift(),
                avg_prediction_drift: await this.getAveragePredictionDrift(),
                data_quality_score: await this.getDataQualityScore(),
                // Alertas e incidentes
                total_alerts: await this.countWeeklyAlerts(),
                critical_incidents: await this.countCriticalIncidents(),
                // Recomendações
                recommendations: await this.generateMLRecommendations()
            };
            // Salvar relatório
            await this.saveMLReport(report);
            // Enviar para stakeholders
            await this.sendMLReport(report);
            console.log(`📊 Weekly ML report generated and sent`);
        }
        catch (error) {
            console.error('❌ Error generating ML report:', error);
            await this.logTrainingError('ml_report', error);
        }
    }
    /**
     * JOB 7: Validação de feature store
     * Execução: Diário às 05:00
     */
    async validateFeatureStore() {
        console.log('🗃️ Validating feature store...');
        try {
            const validationResults = {
                feature_groups_checked: 0,
                data_quality_issues: 0,
                schema_violations: 0,
                freshness_issues: 0,
                fixed_issues: 0
            };
            // 1. Buscar todos os feature groups
            const featureGroups = await this.getAllFeatureGroups();
            for (const featureGroup of featureGroups) {
                validationResults.feature_groups_checked++;
                try {
                    // 2. Validar qualidade dos dados
                    const qualityCheck = await this.validateFeatureGroupQuality(featureGroup.id);
                    if (!qualityCheck.passed) {
                        validationResults.data_quality_issues++;
                        await this.reportDataQualityIssue(featureGroup.id, qualityCheck.issues);
                    }
                    // 3. Validar schema
                    const schemaCheck = await this.validateFeatureGroupSchema(featureGroup.id);
                    if (!schemaCheck.passed) {
                        validationResults.schema_violations++;
                        await this.reportSchemaViolation(featureGroup.id, schemaCheck.violations);
                    }
                    // 4. Validar freshness dos dados
                    const freshnessCheck = await this.validateDataFreshness(featureGroup.id);
                    if (!freshnessCheck.passed) {
                        validationResults.freshness_issues++;
                        await this.reportFreshnessIssue(featureGroup.id, freshnessCheck.lag_hours);
                    }
                    // 5. Tentar corrigir problemas automáticos
                    if (qualityCheck.auto_fixable || schemaCheck.auto_fixable) {
                        await this.autoFixFeatureGroupIssues(featureGroup.id);
                        validationResults.fixed_issues++;
                    }
                }
                catch (error) {
                    console.error(`❌ Error validating feature group ${featureGroup.id}:`, error);
                }
            }
            console.log(`✅ Feature store validation completed:
        - Feature groups checked: ${validationResults.feature_groups_checked}
        - Data quality issues: ${validationResults.data_quality_issues}
        - Schema violations: ${validationResults.schema_violations}
        - Freshness issues: ${validationResults.freshness_issues}
        - Auto-fixed issues: ${validationResults.fixed_issues}
      `);
            await this.logFeatureStoreValidation(validationResults);
            // Enviar alertas se houver problemas críticos
            const criticalIssues = validationResults.data_quality_issues + validationResults.schema_violations;
            if (criticalIssues > 0) {
                await this.sendFeatureStoreAlerts(validationResults);
            }
        }
        catch (error) {
            console.error('❌ Error in feature store validation:', error);
            await this.logTrainingError('feature_store_validation', error);
        }
    }
    // MÉTODOS AUXILIARES
    async prepareWeeklyTrainingData() {
        // Mock - implementar preparação real dos dados
        return {
            samples: Math.floor(Math.random() * 50000) + 10000,
            quality_score: 0.85 + Math.random() * 0.1
        };
    }
    async getOptimizedHyperparameters(algorithm) {
        // Mock - implementar otimização real de hiperparâmetros
        const optimized = {
            'logistic_regression': { C: 0.8, regularization: 'l2' },
            'gradient_boosting': { n_estimators: 120, max_depth: 7, learning_rate: 0.08 },
            'neural_network': { layers: [256, 128, 64, 1], activation: 'relu', dropout: 0.2 }
        };
        return optimized[algorithm] || {};
    }
    async getTopFeatures() {
        return [
            'user_completion_rate',
            'collaborative_score',
            'item_rating_avg',
            'context_time_match',
            'user_streak',
            'item_popularity'
        ];
    }
    async selectBestModelForTesting(models) {
        // Selecionar modelo com melhor AUC-ROC
        return models.reduce((best, current) => current.metrics?.auc_roc > (best.metrics?.auc_roc || 0) ? current : best);
    }
    shouldRetrain(driftMetrics) {
        if (driftMetrics.feature_drift > 0.15) {
            return { required: true, reason: `High feature drift: ${driftMetrics.feature_drift.toFixed(3)}` };
        }
        if (driftMetrics.prediction_drift > 0.20) {
            return { required: true, reason: `High prediction drift: ${driftMetrics.prediction_drift.toFixed(3)}` };
        }
        if (driftMetrics.data_quality < 0.75) {
            return { required: true, reason: `Low data quality: ${driftMetrics.data_quality.toFixed(3)}` };
        }
        return { required: false, reason: 'All metrics within acceptable ranges' };
    }
    // Mock methods - implementar com infraestrutura real
    async logTrainingMetrics(jobName, metrics) {
        console.log(`📊 Training metrics for ${jobName}:`, metrics);
    }
    async logTrainingError(jobName, error) {
        console.error(`❌ Training error for ${jobName}:`, error);
    }
    async evaluateModelPerformance() {
        return {
            accuracy: 0.78,
            precision: 0.75,
            recall: 0.72,
            f1_score: 0.73,
            auc_roc: 0.81
        };
    }
    async saveMonitoringResults(results) {
        console.log('💾 Saving monitoring results');
    }
    async sendCriticalAlerts(alerts) {
        console.log(`🚨 Sending ${alerts.length} critical alerts`);
    }
    async getActiveABExperiments() {
        return []; // Mock
    }
    async collectExperimentMetrics(experimentId) {
        return {
            control_ctr: 0.32,
            treatment_ctr: 0.35,
            control_conversion: 0.68,
            treatment_conversion: 0.71,
            sample_size: 5000
        };
    }
    async calculateStatisticalSignificance(metrics) {
        return {
            ctr_significance: 0.95,
            conversion_significance: 0.87,
            overall_significant: true
        };
    }
    async makeExperimentDecision(experiment, significance) {
        if (significance.overall_significant && significance.ctr_significance > 0.95) {
            return { action: 'promote', reason: 'Statistically significant improvement' };
        }
        if (experiment.duration_days > 14) {
            return { action: 'stop', reason: 'No significant improvement after 14 days' };
        }
        return { action: 'continue', reason: 'Need more data for significance' };
    }
    async promoteModelToProduction(modelId) {
        console.log(`🚀 Promoting model to production: ${modelId}`);
    }
    async stopExperiment(experimentId, reason) {
        console.log(`🛑 Stopping experiment ${experimentId}: ${reason}`);
    }
    async updateExperimentStatus(experimentId, decision) {
        console.log(`📝 Updating experiment ${experimentId} status: ${decision.action}`);
    }
    async notifyAutoRetraining(modelId, reason) {
        console.log(`📧 Notifying team about auto-retraining: ${modelId} - ${reason}`);
    }
    async archiveOldModels(cutoffDate) {
        return Math.floor(Math.random() * 20) + 5;
    }
    async deleteOldExperiments(cutoffDate) {
        return Math.floor(Math.random() * 50) + 10;
    }
    async cleanupModelArtifacts(cutoffDate) {
        return Math.floor(Math.random() * 100) + 20;
    }
    async logCleanupResults(results) {
        console.log('📊 Cleanup results logged');
    }
    async countProductionModels() {
        return 3;
    }
    async countTestingModels() {
        return 2;
    }
    async countWeeklyTrainedModels() {
        return 5;
    }
    async getAverageModelAccuracy() {
        return 0.78;
    }
    async getAveragePredictionLatency() {
        return 45; // ms
    }
    async getTotalPredictionsServed() {
        return 1250000;
    }
    async countActiveExperiments() {
        return 2;
    }
    async countCompletedExperiments() {
        return 8;
    }
    async countSuccessfulPromotions() {
        return 3;
    }
    async getAverageFeatureDrift() {
        return 0.08;
    }
    async getAveragePredictionDrift() {
        return 0.12;
    }
    async getDataQualityScore() {
        return 0.87;
    }
    async countWeeklyAlerts() {
        return 15;
    }
    async countCriticalIncidents() {
        return 2;
    }
    async generateMLRecommendations() {
        return [
            'Consider increasing training frequency for high-drift models',
            'Evaluate new feature engineering approaches',
            'Optimize hyperparameters for gradient boosting models'
        ];
    }
    async saveMLReport(report) {
        console.log('📊 ML report saved');
    }
    async sendMLReport(report) {
        console.log('📧 ML report sent to stakeholders');
    }
    async getAllFeatureGroups() {
        return [
            { id: 'user_features', name: 'User Features' },
            { id: 'item_features', name: 'Item Features' },
            { id: 'context_features', name: 'Context Features' }
        ];
    }
    async validateFeatureGroupQuality(featureGroupId) {
        return {
            passed: Math.random() > 0.2,
            issues: ['Missing values detected', 'Outliers in numerical features'],
            auto_fixable: true
        };
    }
    async validateFeatureGroupSchema(featureGroupId) {
        return {
            passed: Math.random() > 0.1,
            violations: ['Type mismatch in feature X'],
            auto_fixable: false
        };
    }
    async validateDataFreshness(featureGroupId) {
        return {
            passed: Math.random() > 0.15,
            lag_hours: 6
        };
    }
    async reportDataQualityIssue(featureGroupId, issues) {
        console.log(`⚠️ Data quality issues in ${featureGroupId}:`, issues);
    }
    async reportSchemaViolation(featureGroupId, violations) {
        console.log(`⚠️ Schema violations in ${featureGroupId}:`, violations);
    }
    async reportFreshnessIssue(featureGroupId, lagHours) {
        console.log(`⚠️ Data freshness issue in ${featureGroupId}: ${lagHours}h lag`);
    }
    async autoFixFeatureGroupIssues(featureGroupId) {
        console.log(`🔧 Auto-fixing issues in ${featureGroupId}`);
    }
    async logFeatureStoreValidation(results) {
        console.log('📊 Feature store validation logged');
    }
    async sendFeatureStoreAlerts(results) {
        console.log('🚨 Feature store alerts sent');
    }
}
exports.MLTrainingJobs = MLTrainingJobs;
// Instância singleton para uso global
exports.mlTrainingJobs = new MLTrainingJobs();
//# sourceMappingURL=ml-training.job.js.map