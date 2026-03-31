export interface AiInsight {
    id: string;
    type: 'recommendation' | 'alert' | 'achievement' | 'tip';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    category: 'cardiovascular' | 'metabolic' | 'lifestyle' | 'preventive' | 'mental_health';
    actionable: boolean;
    metadata?: any;
    sourceData?: string[];
    createdAt: string;
}
export declare class AiInsightService {
    /**
     * MÉTODO PRINCIPAL: Gera insights personalizados para o paciente
     */
    generatePatientInsights(userId: string): Promise<AiInsight[]>;
    private analyzeMentalHealth;
    private analyzePhysicalActivity;
    private analyzeMedicalAdherence;
    private generatePreventiveTips;
    /**
     * FASE 4: Detecta padrões comportamentais correlacionando métricas
     */
    analyzeCorrelations(logs: any[]): AiInsight[];
    /**
     * FASE 4: Gera ou recupera 3 Micro-ações para o Plano de Ação Diário
     */
    generateDailyActions(patient: any, isLowDay?: boolean): Promise<any[]>;
    /**
     * FASE 5: Detecta se o paciente está em um "Dia Ruim" (Modo Ruim)
     */
    detectLowDay(logs: any[]): boolean;
    /**
     * FASE 5: Gera Narrativa Semanal
     */
    generateWeeklyNarrative(logs: any[], patientName?: string): string;
    /**
     * FASE 5: Memória Contextual
     */
    getContextualMemory(logs: any[]): string | null;
}
export declare const aiInsightService: AiInsightService;
//# sourceMappingURL=aiInsight.service.d.ts.map