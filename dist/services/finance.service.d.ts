export declare class FinanceService {
    /**
     * Calcula as taxas e o valor líquido do parceiro.
     * Prioridade: Taxa customizada nos Dados Financeiros > Plano (PREMIUM 5%, PRO 10%, FREE 15%)
     */
    calculateFees(amount: number, partnerId: string, planTier?: string): Promise<{
        commissionPercent: number;
        doctonFee: number;
        partnerNetPrice: number;
    }>;
    /**
     * Registra a conclusão de um agendamento e atualiza o financeiro do parceiro.
     * Agora busca o preço dinamicamente do serviço vinculado.
     */
    processAppointmentCompletion(appointmentId: string): Promise<{
        commissionPercent: number;
        doctonFee: number;
        partnerNetPrice: number;
    }>;
    /**
     * Retorna estatísticas financeiras detalhadas para o dashboard do parceiro.
     */
    getWalletStats(partnerId: string): Promise<{
        balance: number;
        pendingBalance: number;
        totalRevenue: number;
        transactions: {
            id: string;
            type: string;
            description: string | null;
            createdAt: Date;
            status: string;
            partnerId: string;
            appointmentId: string | null;
            amount: number;
            availableAt: Date | null;
        }[];
    }>;
    /**
     * Solicita um saque do saldo disponível.
     */
    requestPayout(partnerId: string, amount: number, bankDetails: any): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        partnerId: string;
        amount: number;
        bankDetails: import("@prisma/client/runtime/library.js").JsonValue | null;
        processedAt: Date | null;
    }>;
}
export declare const financeService: FinanceService;
//# sourceMappingURL=finance.service.d.ts.map