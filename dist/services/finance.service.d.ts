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
     * Nota: Campos financeiros removidos do modelo Appointment no schema atual.
     * Apenas registramos o fato na tabela Transaction.
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
        totalRevenue: number;
        transactions: {
            id: string;
            type: string;
            description: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            date: Date;
            category: string | null;
            patientId: string | null;
            partnerId: string | null;
            metadata: string | null;
            metadataJson: import("@prisma/client/runtime/library.js").JsonValue | null;
            amount: number;
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
        id: string;
        type: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        date: Date;
        category: string | null;
        patientId: string | null;
        partnerId: string | null;
        metadata: string | null;
        metadataJson: import("@prisma/client/runtime/library.js").JsonValue | null;
        amount: number;
        client: string | null;
        dueDate: Date | null;
        paymentDate: Date | null;
        dreCategory: string | null;
    }>;
}
export declare const financeService: FinanceService;
//# sourceMappingURL=finance.service.d.ts.map