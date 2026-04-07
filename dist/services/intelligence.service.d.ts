export declare class IntelligenceService {
    /**
     * Analisa o perfil de risco do paciente com base nos logs recentes
     */
    analyzeRiskProfile(patientId: string): Promise<{
        level: string;
        factors: any[];
        updatedAt?: undefined;
    } | {
        level: "LOW" | "MEDIUM" | "HIGH" | "NEUTRAL";
        factors: any[];
        updatedAt: Date;
    }>;
    /**
     * Gera um "Nudge" diário (micro-orientação motivacional)
     */
    generateDailyNudge(userId: string): Promise<{
        message: string;
        type: string;
    }>;
    /**
     * Dispara nudges para todos os pacientes ativos
     */
    triggerGlobalNudges(): Promise<{
        sent: number;
        failed: number;
    }>;
    /**
     * Emite uma atualização de saúde via Socket.io
     */
    emitHealthUpdate(userId: string, data: any): Promise<void>;
    /**
     * Wrapper para o aiInsightService
     */
    getInsights(userId: string): Promise<import("./aiInsight.service.js").AiInsight[]>;
    /**
     * Verifica oportunidades de economia para o paciente (Onda 2)
     * Compara assinaturas de medicamentos com produtos e promoções ativos
     */
    checkEconomyOpportunities(userId: string): Promise<any[]>;
}
export declare const intelligenceService: IntelligenceService;
//# sourceMappingURL=intelligence.service.d.ts.map