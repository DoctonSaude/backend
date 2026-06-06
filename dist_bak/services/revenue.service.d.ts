export declare class RevenueService {
    /**
     * Gera insights de receita baseados na ocupação e histórico
     */
    static getInsights(partnerId: string): Promise<{
        occupancyRate: number;
        insights: any[];
        revenuePotential: number;
    }>;
    /**
     * Calcula o preço dinâmico (Stub: HappyHourConfig removido do schema)
     */
    static calculateDynamicPrice(partnerId: string, servicePrice: number, date: Date): Promise<number>;
}
//# sourceMappingURL=revenue.service.d.ts.map