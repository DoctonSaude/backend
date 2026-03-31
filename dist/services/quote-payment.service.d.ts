export declare class QuotePaymentService {
    /**
     * Cria um pagamento para uma cotação aprovada
     */
    createQuotePayment(request: any): Promise<{
        id: any;
        status: any;
        paymentMethod: any;
        amount: any;
        pixQrCode: any;
        pixCopyPaste: any;
        paymentUrl: any;
        expiresAt: any;
    }>;
    /**
     * Obtém status de um pagamento
     */
    getPaymentStatus(paymentId: string): Promise<{
        id: any;
        status: any;
        paymentMethod: any;
        amount: any;
        pixQrCode: any;
        pixCopyPaste: any;
        paymentUrl: any;
        expiresAt: any;
    }>;
    /**
     * Confirma pagamento (chamado pelo webhook)
     */
    confirmPayment(paymentId: string): Promise<void>;
    /**
     * Cancela um pagamento
     */
    cancelPayment(paymentId: string): Promise<void>;
    /**
     * Lista pagamentos do paciente
     */
    listPayments(filters?: any): Promise<{
        payments: any;
        total: any;
        skip: any;
        take: any;
        totalPages: number;
    }>;
}
export declare const quotePaymentService: QuotePaymentService;
//# sourceMappingURL=quote-payment.service.d.ts.map