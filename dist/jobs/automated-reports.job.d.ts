/**
 * Função para calcular a próxima data de geração baseada na frequência
 */
export declare function calculateNextRun(frequency: string, from?: Date): Date;
/**
 * Processa um único relatório (Gera arquivo, envia e-mail e salva histórico)
 */
export declare function processSingleReport(reportId: string): Promise<{
    id: string;
    name: string;
    type: string;
    description: string;
    createdAt: Date;
    template: string | null;
    isActive: boolean;
    frequency: string;
    recipients: string[];
    format: string;
    lastGenerated: Date | null;
    nextGeneration: Date | null;
    filters: import("@prisma/client/runtime/library").JsonValue | null;
}>;
/**
 * Job principal
 */
export declare const startAutomatedReportsJob: () => void;
//# sourceMappingURL=automated-reports.job.d.ts.map