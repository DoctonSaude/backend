/**
 * PROJETO CÉREBRO - FASE 2: JOB DE CÁLCULO DE SIMILARIDADES
 * Processamento em lote para calcular similaridades entre usuários e itens
 * Execução automática para manter recomendações atualizadas
 */
export declare class SimilarityCalculationJobs {
    private collaborativeService;
    constructor();
    /**
     * Inicializa todos os jobs de cálculo de similaridade
     */
    initializeJobs(): void;
    /**
     * JOB 1: Cálculo completo de similaridades
     * Execução: Diário às 02:00
     */
    private runFullSimilarityCalculation;
    /**
     * JOB 2: Atualização incremental
     * Execução: A cada 4 horas
     */
    private runIncrementalUpdate;
    /**
     * JOB 3: Limpeza de similaridades antigas
     * Execução: Semanal, domingo às 03:00
     */
    private cleanupOldSimilarities;
    /**
     * JOB 4: Relatório de qualidade das similaridades
     * Execução: Segunda às 08:00
     */
    private generateSimilarityQualityReport;
    /**
     * JOB 5: Otimização de performance
     * Execução: Mensal, dia 1 às 04:00
     */
    private optimizeSimilarityIndexes;
    private getLastIncrementalUpdate;
    private getNewInteractionsSince;
    private updateLastIncrementalUpdate;
    private removeOldUserSimilarities;
    private removeOldItemSimilarities;
    private removeLowConfidenceSimilarities;
    private countUserSimilarities;
    private countItemSimilarities;
    private getAverageUserSimilarity;
    private getAverageItemSimilarity;
    private getSimilarityConfidenceDistribution;
    private countUsersWithSimilarities;
    private countItemsWithSimilarities;
    private getRecommendationPerformanceMetrics;
    private generateQualityAlerts;
    private saveSimilarityQualityReport;
    private sendQualityAlerts;
    private rebuildUserSimilarityIndexes;
    private rebuildItemSimilarityIndexes;
    private optimizeSimilarityStorage;
    private measureQueryPerformanceImprovement;
    private logJobMetrics;
    private logJobError;
}
export declare const similarityCalculationJobs: SimilarityCalculationJobs;
//# sourceMappingURL=similarity-calculation.job.d.ts.map