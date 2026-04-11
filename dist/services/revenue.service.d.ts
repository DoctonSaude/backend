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
     * Calcula o preço com desconto de Happy Hour se aplicável
     */
    static calculateDynamicPrice(partnerId: string, servicePrice: number, date: Date): Promise<number>;
}
//# sourceMappingURL=revenue.service.d.ts.map