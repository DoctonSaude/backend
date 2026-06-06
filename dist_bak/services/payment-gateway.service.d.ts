/**
 * ============================================================
 *  DOCTON SAÚDE — Payment Gateway Abstraction Layer
 * ============================================================
 *
 * Para integrar um novo gateway de pagamento:
 *   1. Crie uma nova classe que implemente `PaymentGateway`
 *   2. Implemente todos os métodos da interface
 *   3. Troque `MockPaymentGateway` por sua classe no `createGateway()`
 *   4. Configure as variáveis de ambiente necessárias no .env
 *
 * Variáveis de ambiente esperadas (configure conforme o gateway):
 *   PAYMENT_GATEWAY_PROVIDER   = 'mock' | 'stripe' | 'mercadopago' | 'pagarme' | 'custom'
 *   PAYMENT_GATEWAY_API_KEY    = Chave de API do gateway
 *   PAYMENT_GATEWAY_API_SECRET = Secret do gateway (se necessário)
 *   PAYMENT_GATEWAY_BASE_URL   = URL base da API do gateway
 *   PAYMENT_GATEWAY_WEBHOOK_SECRET = Secret para validar webhooks
 *   PAYMENT_GATEWAY_PUBLIC_KEY = Chave pública (para gateways que exigem)
 * ============================================================
 */
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO';
export type ChargeStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED' | 'FAILED';
export interface CreateChargeParams {
    /** Valor a cobrar em reais (ex: 150.00) */
    amount: number;
    /** Método de pagamento */
    method: PaymentMethod;
    /** Descrição que aparece para o cliente */
    description: string;
    /** Referência interna (ex: appointmentId, orderId) */
    externalReference: string;
    /** Dados do cliente */
    customer: {
        name: string;
        email: string;
        /** CPF ou CNPJ sem formatação */
        taxId?: string;
        phone?: string;
    };
    /** Número de parcelas (apenas cartão) */
    installments?: number;
    /** Dias até vencer (PIX = 1, Boleto = normalmente 3) */
    dueDateDays?: number;
}
export interface ChargeResponse {
    /** ID da cobrança no gateway */
    gatewayId: string;
    /** Status inicial da cobrança */
    status: ChargeStatus;
    /** Método de pagamento */
    method: PaymentMethod;
    /** Valor cobrado */
    amount: number;
    /** QR Code em base64 (PIX) */
    pixQrCode?: string;
    /** Linha digitável PIX (copia e cola) */
    pixCopyPaste?: string;
    /** URL para pagamento (cartão / boleto) */
    paymentUrl?: string;
    /** Linha digitável do boleto */
    boletoLine?: string;
    /** Data de expiração da cobrança */
    expiresAt: Date;
    /** Referência interna passada na criação */
    externalReference: string;
    /** Dados brutos retornados pelo gateway (para debugging) */
    rawResponse?: Record<string, any>;
}
export interface WebhookPayload {
    /** ID da cobrança no gateway */
    gatewayId: string;
    /** Novo status da cobrança */
    status: ChargeStatus;
    /** Referência interna original */
    externalReference?: string;
    /** Data/hora do pagamento */
    paidAt?: Date;
    /** Payload bruto do webhook (para log) */
    raw: Record<string, any>;
}
export interface PaymentGateway {
    /** Nome do provider (para logs) */
    readonly providerName: string;
    /** Cria uma nova cobrança */
    createCharge(params: CreateChargeParams): Promise<ChargeResponse>;
    /** Consulta o status atual de uma cobrança */
    getChargeStatus(gatewayId: string): Promise<{
        status: ChargeStatus;
        paidAt?: Date;
    }>;
    /** Cancela/estorna uma cobrança */
    cancelCharge(gatewayId: string): Promise<void>;
    /** Valida a autenticidade de um webhook recebido */
    validateWebhook(payload: Record<string, any>, signature: string): boolean;
    /** Normaliza o payload do webhook para o formato interno */
    parseWebhookPayload(raw: Record<string, any>): WebhookPayload;
}
export declare const paymentGateway: PaymentGateway;
//# sourceMappingURL=payment-gateway.service.d.ts.map