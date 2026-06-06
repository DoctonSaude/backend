export declare enum AccountType {
    ASSET = "ASSET",
    LIABILITY = "LIABILITY",
    EQUITY = "EQUITY",
    INCOME = "INCOME",
    EXPENSE = "EXPENSE"
}
export declare class LedgerService {
    /**
     * Garante que uma conta Ledger exista para uma pessoa ou propósito
     */
    getOrCreateAccount(name: string, type: AccountType, personId?: string): Promise<{
        type: string;
        name: string;
        id: string;
        personId: string | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        currency: string;
    }>;
    /**
     * Registra uma entrada no diário (Double-entry)
     * Dr (Débito) na conta receptora
     * Cr (Crédito) na conta de origem
     */
    recordEntry(params: {
        transactionId: string;
        description: string;
        amount: number;
        debitAccountId: string;
        creditAccountId: string;
        metadata?: any;
    }): Promise<{
        timestamp: Date;
        id: string;
        createdAt: Date;
        description: string;
        amount: number;
        metadata: string | null;
        transactionId: string;
        debitAccountId: string;
        creditAccountId: string;
    }>;
    /**
     * Busca o saldo de uma conta (Créditos - Débitos)
     * Nota: Para contas de Passivo/Receita, Crédito aumenta o saldo.
     * Para contas de Ativo/Despesa, Débito aumenta o saldo.
     */
    getAccountBalance(accountId: string): Promise<number>;
}
export declare const ledgerService: LedgerService;
//# sourceMappingURL=ledger.service.d.ts.map