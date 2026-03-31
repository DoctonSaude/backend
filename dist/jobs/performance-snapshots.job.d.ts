import { PharmacyPerformanceService } from '../services/pharmacy-performance.service.js';
/**
 * Job agendado para criar snapshots diários de performance
 * Roda todos os dias à meia-noite
 */
export declare class PerformanceSnapshotJob {
    performanceService: PharmacyPerformanceService;
    isRunning: boolean;
    constructor();
    start(): void;
    executeSnapshot(): Promise<void>;
    updateAllScores(): Promise<void>;
    /**
     * Executa manualmente a criação de snapshots
     */
    executeSnapshotManually(): Promise<void>;
    /**
     * Executa manualmente a atualização de scores
     */
    updateScoresManually(): Promise<void>;
}
export declare const performanceSnapshotJob: PerformanceSnapshotJob;
//# sourceMappingURL=performance-snapshots.job.d.ts.map