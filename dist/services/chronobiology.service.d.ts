export interface ChronoInsight {
    timeOfDay: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
    bestActivity: string;
    peakEnergyScore: number;
    description: string;
    recommendedActions: string[];
}
export declare class ChronobiologyService {
    /**
     * Determina a faixa horária de um registro
     */
    private getTimeRange;
    /**
     * Analisa qual o melhor horário para o paciente baseado em Humor e Energia passados
     * @param patientId ID interno do paciente (para filtrar logs)
     */
    analyzePeakPerformance(patientId: any): Promise<ChronoInsight | null>;
}
export declare const chronobiologyService: ChronobiologyService;
//# sourceMappingURL=chronobiology.service.d.ts.map