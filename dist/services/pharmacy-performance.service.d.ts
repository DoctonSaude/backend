export declare class PharmacyPerformanceService {
    /**
     * Calcula o score de performance de uma farmácia
     */
    calculatePharmacyScore(pharmacyId: string, patientLocation?: any): Promise<{
        responseTimeScore: number;
        responseRateScore: any;
        priceCompetitivenessScore: number;
        distanceScore: any;
        planScore: any;
        overallScore: number;
    }>;
    /**
     * Atualiza o score de uma farmácia no banco
     */
    updatePharmacyScore(pharmacyId: string, patientLocation?: any): Promise<void>;
    /**
     * Atualiza métricas de performance após uma resposta
     */
    updateMetricsAfterResponse(pharmacyId: string, responseTimeMinutes: number, price: number): Promise<void>;
    /**
     * Cria snapshot diário de performance
     */
    createPerformanceSnapshot(pharmacyId: string): Promise<void>;
    getRankedPharmacies(params: any): Promise<any[]>;
    calculateResponseTimeScore(averageMinutes: number): number;
    calculateResponseRateScore(received: number, responded: number): any;
    calculatePriceCompetitivenessScore(priceVsMarket: number): number;
    calculateDistanceScore(pharmacy: any, patientLocation: any): number;
    calculatePlanScore(plan?: string): any;
    getMarketAveragePriceForSimilarProducts(): Promise<number>;
    getMarketDataForPharmacy(pharmacyId: string): Promise<{
        averagePrice: number;
        competitorCount: number;
        marketShare: number;
    }>;
}
//# sourceMappingURL=pharmacy-performance.service.d.ts.map