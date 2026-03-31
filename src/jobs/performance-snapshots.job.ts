import cron from 'node-cron';
import { PharmacyPerformanceService } from '../services/pharmacy-performance.service.js';
import { PEDOMED_CONFIG } from '../config/pedomed.config.js';
import prisma from '../lib/prisma.js';

/**
 * Job agendado para criar snapshots diários de performance
 * Roda todos os dias à meia-noite
 */
export class PerformanceSnapshotJob {
    performanceService: PharmacyPerformanceService;
    isRunning = false;
    constructor() {
        this.performanceService = new PharmacyPerformanceService();
    }
    start() {
        // Agendar para rodar todos os dias à meia-noite (00:00)
        cron.schedule('0 0 * * *', async () => {
            await this.executeSnapshot();
        });
        // Agendar para rodar a cada hora para atualização de scores
        cron.schedule('0 * * * *', async () => {
            await this.updateAllScores();
        });
        console.log('[PerformanceSnapshotJob] Scheduled jobs started');
        console.log('  - Daily snapshots: 00:00 every day');
        console.log('  - Score updates: Every hour at minute 0');
    }
    async executeSnapshot() {
        if (this.isRunning) {
            console.log('[PerformanceSnapshotJob] Already running, skipping');
            return;
        }
        this.isRunning = true;
        const startTime = Date.now();
        try {
            console.log('[PerformanceSnapshotJob] Starting daily snapshot creation...');
            // Buscar todas as farmácias ativas
            const pharmacies = await prisma.pharmacy.findMany({
                where: ({
                    lat: { not: null },
                    lng: { not: null }
                } as any),
                select: { id: true }
            });
            console.log(`[PerformanceSnapshotJob] Creating snapshots for ${pharmacies.length} pharmacies...`);
            let successCount = 0;
            let errorCount = 0;
            for (const pharmacy of pharmacies) {
                try {
                    await this.performanceService.createPerformanceSnapshot(pharmacy.id);
                    successCount++;
                }
                catch (error) {
                    console.error(`[PerformanceSnapshotJob] Error creating snapshot for pharmacy ${pharmacy.id}:`, error);
                    errorCount++;
                }
            }
            const duration = Date.now() - startTime;
            console.log(`[PerformanceSnapshotJob] Daily snapshot completed in ${duration}ms`);
            console.log(`  - Success: ${successCount}`);
            console.log(`  - Errors: ${errorCount}`);
        }
        catch (error) {
            console.error('[PerformanceSnapshotJob] Critical error in snapshot job:', error);
        }
        finally {
            this.isRunning = false;
        }
    }
    async updateAllScores() {
        if (this.isRunning) {
            console.log('[PerformanceSnapshotJob] Score update skipped (snapshot job running)');
            return;
        }
        try {
            console.log('[PerformanceSnapshotJob] Starting hourly score updates...');
            // Buscar farmácias que precisam de atualização de score
            const pharmacies = await prisma.pharmacy.findMany({
                where: ({
                    lat: { not: null },
                    lng: { not: null },
                    OR: [
                        { scoreUpdatedAt: null },
                        {
                            scoreUpdatedAt: {
                                lt: new Date(Date.now() - (PEDOMED_CONFIG.PERFORMANCE_SCORE as any).SCORE_RECALCULATION_MINUTES * 60 * 1000)
                            }
                        }
                    ]
                } as any),
                select: { id: true }
            });
            if (pharmacies.length === 0) {
                console.log('[PerformanceSnapshotJob] No pharmacies need score updates');
                return;
            }
            console.log(`[PerformanceSnapshotJob] Updating scores for ${pharmacies.length} pharmacies...`);
            let successCount = 0;
            let errorCount = 0;
            for (const pharmacy of pharmacies) {
                try {
                    await this.performanceService.updatePharmacyScore(pharmacy.id);
                    successCount++;
                }
                catch (error) {
                    console.error(`[PerformanceSnapshotJob] Error updating score for pharmacy ${pharmacy.id}:`, error);
                    errorCount++;
                }
            }
            console.log(`[PerformanceSnapshotJob] Score update completed`);
            console.log(`  - Success: ${successCount}`);
            console.log(`  - Errors: ${errorCount}`);
        }
        catch (error) {
            console.error('[PerformanceSnapshotJob] Critical error in score update job:', error);
        }
    }
    /**
     * Executa manualmente a criação de snapshots
     */
    async executeSnapshotManually() {
        await this.executeSnapshot();
    }
    /**
     * Executa manualmente a atualização de scores
     */
    async updateScoresManually() {
        await this.updateAllScores();
    }
}
// Exportar instância única
export const performanceSnapshotJob = new PerformanceSnapshotJob();
