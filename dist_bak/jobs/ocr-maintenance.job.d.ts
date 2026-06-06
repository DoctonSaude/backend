/**
 * Job de Manutenção para OCR e Cotação por Foto (Fase 6)
 * Limpeza de imagens antigas, métricas e otimizações
 */
export declare class OCRMaintenanceJob {
    isRunning: boolean;
    start(): void;
    /**
     * Executa manutenção completa
     */
    performMaintenance(): Promise<void>;
    /**
     * Limpa imagens antigas do storage
     */
    cleanupOldImages(): Promise<void>;
    /**
     * Limpa processamentos expirados
     */
    cleanupExpiredProcessing(): Promise<void>;
    /**
     * Atualiza métricas e estatísticas
     */
    updateMetrics(): Promise<void>;
    /**
     * Otimiza banco de dados
     */
    optimizeDatabase(): Promise<void>;
    /**
     * Gera relatório de saúde do sistema OCR
     */
    generateHealthReport(): Promise<void>;
    /**
     * Estima uso de storage
     */
    estimateStorageUsage(): Promise<number>;
    /**
     * Executa manutenção manualmente
     */
    performMaintenanceManually(): Promise<void>;
}
export declare const ocrMaintenanceJob: OCRMaintenanceJob;
//# sourceMappingURL=ocr-maintenance.job.d.ts.map