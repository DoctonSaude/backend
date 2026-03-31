export declare class PaymentService {
    /**
     * Gera um micro-depósito Pix para um agendamento
     */
    generatePixDeposit(appointmentId: string, amount: number): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        amount: number;
        appointmentId: string;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        txId: string | null;
        paidAt: Date | null;
    }>;
    /**
     * Confirma o pagamento de um Pix e atualiza o Ledger + Agendamento
     */
    confirmPixPayment(txId: string): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        amount: number;
        appointmentId: string;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        txId: string | null;
        paidAt: Date | null;
    }>;
    /**
     * Cancela depósitos expirados
     */
    cleanupExpiredDeposits(): Promise<number>;
}
export declare const paymentService: PaymentService;
//# sourceMappingURL=payment.service.d.ts.map