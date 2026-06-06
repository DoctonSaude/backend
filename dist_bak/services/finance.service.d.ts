export declare class FinanceService {
    /**
     * Calcula as taxas e o valor líquido do parceiro.
     * Padrão 15% de taxa de plataforma.
     */
    calculateFees(amount: number, partnerId: string): Promise<{
        commissionPercent: number;
        doctonFee: number;
        partnerNetPrice: number;
    }>;
    /**
     * Registra a conclusão de um agendamento e atualiza o financeiro do parceiro.
     * Usa o preço real da consulta configurado no perfil do parceiro.
     */
    processAppointmentCompletion(appointmentId: string): Promise<{
        commissionPercent: number;
        doctonFee: number;
        partnerNetPrice: number;
    }>;
    /**
     * Retorna estatísticas financeiras usando o modelo Transaction.
     */
    getWalletStats(partnerId: string): Promise<{
        balance: number;
        pendingBalance: number;
        pendingWithdrawal: number;
        totalRevenue: number;
        transactions: {
            type: string;
            status: string;
            date: Date;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            patientId: string | null;
            description: string;
            category: string | null;
            amount: number;
            metadata: string | null;
            metadataJson: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
            partnerId: string | null;
            client: string | null;
            dueDate: Date | null;
            paymentDate: Date | null;
            dreCategory: string | null;
        }[];
    }>;
    /**
     * Solicita um saque do saldo disponível.
     */
    requestPayout(partnerId: string, amount: number): Promise<{
        type: string;
        status: string;
        date: Date;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string | null;
        description: string;
        category: string | null;
        amount: number;
        metadata: string | null;
        metadataJson: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
        partnerId: string | null;
        client: string | null;
        dueDate: Date | null;
        paymentDate: Date | null;
        dreCategory: string | null;
    }>;
    /**
     * Processa a liquidação de repasses pendentes (D+30).
     * Transforma créditos PENDING em COMPLETED após a janela de segurança.
     */
    processLiquidations(): Promise<number>;
}
export declare const financeService: FinanceService;
//# sourceMappingURL=finance.service.d.ts.map