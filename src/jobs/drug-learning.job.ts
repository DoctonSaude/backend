import cron from 'node-cron';
import { PEDOMED_CONFIG } from '../config/pedomed.config.js';
import { DrugMatchingService } from '../services/drug-matching.service.js';

/**
 * Job de Learning System para Drug Matching Engine (Fase 5)
 * Versão limpa sem erros de sintaxe
 */
export class DrugLearningJob {
    drugMatchingService: DrugMatchingService;
    isRunning = false;
    constructor() {
        this.drugMatchingService = new DrugMatchingService();
    }
    start() {
        // Agendar para rodar todos os dias às 2h da manhã
        cron.schedule('0 2 * * *', async () => {
            await this.analyzeFailedSearches();
        });
        // Agendar para rodar a cada 6 horas para limpeza de cache
        cron.schedule('0 */6 * * *', async () => {
            await this.performMaintenance();
        });
        console.log('[DrugLearningJob] Scheduled jobs started');
        console.log('  - Failed search analysis: 02:00 every day');
        console.log('  - Cache cleanup: Every 6 hours');
    }
    /**
     * Analisa buscas falhadas e sugere novos aliases
     */
    async analyzeFailedSearches() {
        if (this.isRunning) {
            console.log('[DrugLearningJob] Already running, skipping');
            return;
        }
        this.isRunning = true;
        const startTime = Date.now();
        try {
            console.log('[DrugLearningJob] Starting failed search analysis...');
            if (!PEDOMED_CONFIG.DRUG_MATCHING.LEARNING.ENABLED) {
                console.log('[DrugLearningJob] Learning system disabled, skipping');
                return;
            }
            // TODO: Implementar análise quando Prisma client for regenerado
            console.log('[DrugLearningJob] Analysis skipped - waiting for Prisma client regeneration');
            const duration = Date.now() - startTime;
            console.log(`[DrugLearningJob] Analysis completed in ${duration}ms (skipped mode)`);
        }
        catch (error) {
            console.error('[DrugLearningJob] Critical error in analysis job:', error);
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Tarefas de manutenção
     */
    async performMaintenance() {
        try {
            console.log('[DrugLearningJob] Starting maintenance tasks...');
            // 1. Limpar cache expirado
            this.drugMatchingService.cleanupExpiredCache();
            console.log('[DrugLearningJob] Maintenance completed successfully');
        }
        catch (error) {
            console.error('[DrugLearningJob] Error in maintenance tasks:', error);
        }
    }
}
// Exportar instância única
export const drugLearningJob = new DrugLearningJob();
