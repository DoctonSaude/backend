/**
 * Função para calcular a próxima data de geração baseada na frequência
 */
export declare function calculateNextRun(frequency: string, from?: Date): Date;
/**
 * Processa um único relatório (Gera arquivo, envia e-mail e salva histórico)
 */
export declare function processSingleReport(reportId: string): Promise<{
    type: string;
    description: string;
    id: string;
    name: string;
    createdAt: Date;
    template: string | null;
    isActive: boolean;
    frequency: string;
    format: string;
    recipients: string[];
    lastGenerated: Date | null;
    nextGeneration: Date | null;
    filters: import("../../lib/generated/prisma/runtime/library").JsonValue | null;
}>;
/**
 * Job principal
 */
export declare const startAutomatedReportsJob: () => void;
//# sourceMappingURL=automated-reports.job.d.ts.map