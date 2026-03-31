export declare class SubsidyService {
    /**
     * Calcula o subsídio para um paciente em um determinado valor de compra
     */
    calculateSubsidy(userId: string, totalAmount: number): Promise<{
        isEligible: boolean;
        subsidyAmount: number;
        finalAmount: number;
        reason: string;
        benefitId?: undefined;
    } | {
        isEligible: boolean;
        subsidyAmount: number;
        finalAmount: number;
        benefitId: any;
        reason?: undefined;
    }>;
}
export declare const subsidyService: SubsidyService;
//# sourceMappingURL=subsidy.service.d.ts.map