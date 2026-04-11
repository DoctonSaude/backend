export declare class HealthJourneyService {
    /**
     * Inicia a jornada de tratamento agudo
     */
    startAcuteJourney(patientId: string, term: string): Promise<any>;
    /**
     * Busca a jornada ativa do paciente
     */
    getActiveJourney(patientId: string): Promise<any>;
    /**
     * Retorna sugestões dinâmicas baseadas na jornada ativa e localização
     */
    getJourneySuggestions(patientId: string, location?: {
        city?: string;
    }): Promise<{
        title: string;
        suggestions: {
            label: string;
            icon: string;
            action: string;
            metadata: {
                city: string;
            };
        }[];
    }>;
    /**
     * Avança o step da jornada e dispara a notificação correspondente
     */
    advanceJourneyStep(journeyId: string): Promise<any>;
    /**
     * Dispara a notificação baseada no passo atual da jornada
     */
    triggerJourneyStep(journey: any): Promise<void>;
    /**
     * Finaliza uma jornada
     */
    completeJourney(journeyId: string): Promise<any>;
}
export declare const healthJourneyService: HealthJourneyService;
//# sourceMappingURL=health-journey.service.d.ts.map