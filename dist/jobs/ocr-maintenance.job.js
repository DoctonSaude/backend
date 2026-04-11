"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ocrMaintenanceJob = exports.OCRMaintenanceJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const pedomed_config_js_1 = require("../config/pedomed.config.js");
/**
 * Job de Manutenção para OCR e Cotação por Foto (Fase 6)
 * Limpeza de imagens antigas, métricas e otimizações
 */
class OCRMaintenanceJob {
    isRunning = false;
    start() {
        // Agendar para rodar todos os dias às 3h da manhã
        node_cron_1.default.schedule('0 3 * * *', async () => {
            await this.performMaintenance();
        });
        // Agendar para rodar a cada 6 horas para limpeza de cache
        node_cron_1.default.schedule('0 */6 * * *', async () => {
            await this.cleanupExpiredProcessing();
        });
        console.log('[OCRMaintenanceJob] Scheduled jobs started');
        console.log('  - Full maintenance: 03:00 every day');
        console.log('  - Expired cleanup: Every 6 hours');
    }
    /**
     * Executa manutenção completa
     */
    async performMaintenance() {
        if (this.isRunning) {
            console.log('[OCRMaintenanceJob] Already running, skipping');
            return;
        }
        this.isRunning = true;
        const startTime = Date.now();
        try {
            console.log('[OCRMaintenanceJob] Starting full maintenance...');
            // 1. Limpar imagens antigas
            await this.cleanupOldImages();
            // 2. Limpar processamentos expirados
            await this.cleanupExpiredProcessing();
            // 3. Atualizar métricas
            await this.updateMetrics();
            // 4. Otimizar banco de dados
            await this.optimizeDatabase();
            // 5. Gerar relatório de saúde
            await this.generateHealthReport();
            const duration = Date.now() - startTime;
            console.log(`[OCRMaintenanceJob] Full maintenance completed in ${duration}ms`);
        }
        catch (error) {
            console.error('[OCRMaintenanceJob] Critical error in maintenance:', error);
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Limpa imagens antigas do storage
     */
    async cleanupOldImages() {
        try {
            const uploadsDir = pedomed_config_js_1.PEDOMED_CONFIG.OCR.STORAGE.LOCAL_PATH;
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
            const cutoffTime = Date.now() - maxAge;
            console.log('[OCRMaintenanceJob] Cleaning up old images...');
            // Listar arquivos no diretório
            const files = await promises_1.default.readdir(uploadsDir);
            let deletedCount = 0;
            let totalSize = 0;
            for (const file of files) {
                const filePath = path_1.default.join(uploadsDir, file);
                const stats = await promises_1.default.stat(filePath);
                if (stats.mtime.getTime() < cutoffTime) {
                    totalSize += stats.size;
                    await promises_1.default.unlink(filePath);
                    deletedCount++;
                }
            }
            console.log(`[OCRMaintenanceJob] Deleted ${deletedCount} old images (${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
        }
        catch (error) {
            console.error('[OCRMaintenanceJob] Error cleaning up old images:', error);
        }
    }
    /**
     * Limpa processamentos expirados
     */
    async cleanupExpiredProcessing() {
        try {
            console.log('[OCRMaintenanceJob] Cleaning up expired processing...');
            console.log('[OCRMaintenanceJob] Cleanup simulated - waiting for Prisma client regeneration');
        }
        catch (error) {
            console.error('[OCRMaintenanceJob] Error cleaning up expired processing:', error);
        }
    }
    /**
     * Atualiza métricas e estatísticas
     */
    async updateMetrics() {
        try {
            console.log('[OCRMaintenanceJob] Updating metrics...');
            console.log('[OCRMaintenanceJob] Metrics update simulated - waiting for Prisma client regeneration');
        }
        catch (error) {
            console.error('[OCRMaintenanceJob] Error updating metrics:', error);
        }
    }
    /**
     * Otimiza banco de dados
     */
    async optimizeDatabase() {
        try {
            console.log('[OCRMaintenanceJob] Optimizing database...');
            // Atualizar estatísticas do PostgreSQL
            await prisma_js_1.default.$executeRaw `ANALYZE "OCRProcessing"`;
            await prisma_js_1.default.$executeRaw `ANALYZE "OCRDetectedDrug"`;
            await prisma_js_1.default.$executeRaw `ANALYZE "OCRQuoteRequest"`;
            console.log('[OCRMaintenanceJob] Database optimization completed');
        }
        catch (error) {
            console.error('[OCRMaintenanceJob] Error optimizing database:', error);
        }
    }
    /**
     * Gera relatório de saúde do sistema OCR
     */
    async generateHealthReport() {
        try {
            console.log('[OCRMaintenanceJob] Generating health report...');
            const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const [errorCount, slowProcessingCount, lowConfidenceCount, storageUsage] = await Promise.all([
                // Contagem de erros
                prisma_js_1.default.oCRProcessing.count({
                    where: {
                        createdAt: { gte: last24h },
                        status: 'FAILED'
                    }
                }),
                // Processamentos lentos
                prisma_js_1.default.oCRProcessing.count({
                    where: {
                        createdAt: { gte: last24h },
                        processingTimeMs: { gt: pedomed_config_js_1.PEDOMED_CONFIG.OCR.MONITORING.PERFORMANCE_ALERTS.SLOW_PROCESSING_THRESHOLD_MS }
                    }
                }),
                // Baixa confiança
                prisma_js_1.default.oCRProcessing.count({
                    where: {
                        createdAt: { gte: last24h },
                        confidence: { lt: pedomed_config_js_1.PEDOMED_CONFIG.OCR.MONITORING.PERFORMANCE_ALERTS.LOW_CONFIDENCE_THRESHOLD }
                    }
                }),
                // Uso de storage (estimado)
                this.estimateStorageUsage()
            ]);
            // Verificar alertas
            const alerts = [];
            const errorRate = errorCount / 100; // Assumindo 100 processamentos/dia
            if (errorRate > pedomed_config_js_1.PEDOMED_CONFIG.OCR.MONITORING.PERFORMANCE_ALERTS.ERROR_RATE_THRESHOLD) {
                alerts.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
            }
            if (slowProcessingCount > 10) {
                alerts.push(`${slowProcessingCount} slow processings detected`);
            }
            if (lowConfidenceCount > 20) {
                alerts.push(`${lowConfidenceCount} low confidence processings detected`);
            }
            if (storageUsage > 1024) { // 1GB
                alerts.push(`High storage usage: ${(storageUsage / 1024).toFixed(2)}GB`);
            }
            console.log('[OCRMaintenanceJob] Health Report:');
            console.log(`  - Errors (24h): ${errorCount}`);
            console.log(`  - Slow processing: ${slowProcessingCount}`);
            console.log(`  - Low confidence: ${lowConfidenceCount}`);
            console.log(`  - Storage usage: ${(storageUsage / 1024).toFixed(2)}GB`);
            if (alerts.length > 0) {
                console.log('[OCRMaintenanceJob] ⚠️  Alerts:');
                alerts.forEach((alert) => console.log(`    - ${alert}`));
            }
            else {
                console.log('[OCRMaintenanceJob] ✅ All systems healthy');
            }
        }
        catch (error) {
            console.error('[OCRMaintenanceJob] Error generating health report:', error);
        }
    }
    /**
     * Estima uso de storage
     */
    async estimateStorageUsage() {
        try {
            const uploadsDir = pedomed_config_js_1.PEDOMED_CONFIG.OCR.STORAGE.LOCAL_PATH;
            const files = await promises_1.default.readdir(uploadsDir);
            let totalSize = 0;
            for (const file of files) {
                const filePath = path_1.default.join(uploadsDir, file);
                const stats = await promises_1.default.stat(filePath);
                totalSize += stats.size;
            }
            return totalSize / 1024 / 1024; // Converter para MB
        }
        catch (error) {
            console.error('[OCRMaintenanceJob] Error estimating storage usage:', error);
            return 0;
        }
    }
    /**
     * Executa manutenção manualmente
     */
    async performMaintenanceManually() {
        await this.performMaintenance();
    }
}
exports.OCRMaintenanceJob = OCRMaintenanceJob;
// Exportar instância única
exports.ocrMaintenanceJob = new OCRMaintenanceJob();
//# sourceMappingURL=ocr-maintenance.job.js.map