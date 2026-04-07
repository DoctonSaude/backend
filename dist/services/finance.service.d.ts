export declare class FinanceService {
    /**
     * Calcula as taxas e o valor líquido do parceiro com base no plano.
     * FREE: 15% | PRO: 10% | PREMIUM: 5%
     */
    calculateFees(amount: number, planTier?: string): {
        commissionPercent: number;
        doctonFee: number;
        partnerNetPrice: number;
    };
    /**
     * Registra a conclusão de um agendamento e atualiza o financeiro do parceiro.
     * Implementa liquidação D+1 por padrão.
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
            type: string;
            status: string;
            description: string | null;
            id: string;
            createdAt: Date;
            partnerId: string;
            amount: number;
            availableAt: Date | null;
            appointmentId: string | null;
        }[];
    }>;
    /**
     * Solicita um saque do saldo disponível.
     */
    requestPayout(partnerId: string, amount: number, bankDetails: any): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        partnerId: string;
        amount: number;
        bankDetails: import("../../lib/generated/prisma/runtime/library.js").JsonValue | null;
        processedAt: Date | null;
    }>;
}
export declare const financeService: FinanceService;
//# sourceMappingURL=finance.service.d.ts.map