/**
 * Função para calcular a próxima data de geração baseada na frequência
 */
export declare function calculateNextRun(frequency: string, from?: Date): Date;
/**
 * Processa um único relatório (Gera arquivo, envia e-mail e salva histórico)
 */
export declare function processSingleReport(reportId: string): Promise<{
    type: string;
    name: string;
    template: string | null;
    id: string;
    createdAt: Date;
    description: string;
    frequency: string;
    isActive: boolean;
    filters: import("lib/generated/prisma/runtime/library").JsonValue | null;
    recipients: string[];
    format: string;
    lastGenerated: Date | null;
    nextGeneration: Date | null;
}>;
/**
 * Job principal
 */
export declare const startAutomatedReportsJob: () => void;
//# sourceMappingURL=automated-reports.job.d.ts.map