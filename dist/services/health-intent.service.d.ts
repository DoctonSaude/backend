export declare class HealthIntentService {
    /**
     * Tenta classificar a intenção via IA (LLM)
     */
    classifyWithAI(term: string): Promise<{
        intent: any;
        confidence: any;
        context: {
            term: string;
            suggestedServices: any;
        };
    }>;
    /**
     * Classifica uma intenção baseada em um termo de busca ou ação
     * Implementação inicial baseada em regras (Rule-based)
     */
    classifyIntent(term: string): {
        intent: string;
        confidence: number;
        context: {
            term: string;
            suggestedServices: string[];
        };
    };
    /**
     * Processa a intenção e orquestra as ações (salva no banco + gatilhos)
     */
    processIntent(patientId: string, term: string, eventId?: string): Promise<any>;
}
export declare const healthIntentService: HealthIntentService;
//# sourceMappingURL=health-intent.service.d.ts.map