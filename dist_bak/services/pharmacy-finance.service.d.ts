/**
 * PharmacyFinanceService
 * Responsável pela lógica de liquidação e gestão financeira das farmácias.
 */
export declare class PharmacyFinanceService {
    /**
     * processSettlements
     * Busca pedidos concluídos e gera transações de repasse (liquidação).
     */
    static processSettlements(): Promise<number>;
    /**
     * getPharmacyBalance
     * Calcula o saldo atual da farmácia com base nas transações de liquidação.
     */
    static getPharmacyBalance(pharmacyId: string): Promise<any>;
}
//# sourceMappingURL=pharmacy-finance.service.d.ts.map