import { DrugMatchingService } from '../services/drug-matching.service.js';
/**
 * Job de Learning System para Drug Matching Engine (Fase 5)
 * Versão limpa sem erros de sintaxe
 */
export declare class DrugLearningJob {
    drugMatchingService: DrugMatchingService;
    isRunning: boolean;
    constructor();
    start(): void;
    /**
     * Analisa buscas falhadas e sugere novos aliases
     */
    analyzeFailedSearches(): Promise<void>;
    /**
     * Tarefas de manutenção
     */
    performMaintenance(): Promise<void>;
}
export declare const drugLearningJob: DrugLearningJob;
//# sourceMappingURL=drug-learning.job.d.ts.map