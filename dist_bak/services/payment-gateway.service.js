"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentGateway = void 0;
// ─── Implementação Mock (Desenvolvimento) ─────────────────────────────────────
/**
 * MockPaymentGateway
 * Simula um gateway de pagamento para desenvolvimento e testes.
 * Substitua por um gateway real em produção.
 *
 * Comportamento:
 *   - PIX: retorna QR code fictício, expira em 30 min
 *   - Cartão: retorna link de pagamento fictício
 *   - Boleto: retorna linha digitável fictícia, expira em 3 dias
 *   - Webhooks: aceita qualquer token que comece com 'docton_'
 */
class MockPaymentGateway {
    providerName = 'MockGateway (Dev Only)';
    async createCharge(params) {
        const gatewayId = `MOCK_${params.method}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const expiresAt = new Date();
        console.log(`[PaymentGateway:Mock] Criando cobrança ${gatewayId} | ${params.method} | R$ ${params.amount}`);
        switch (params.method) {
            case 'PIX': {
                expiresAt.setMinutes(expiresAt.getMinutes() + 30);
                return {
                    gatewayId,
                    status: 'PENDING',
                    method: 'PIX',
                    amount: params.amount,
                    pixQrCode: `data:image/png;base64,MOCK_PIX_QRCODE_${gatewayId}`,
                    pixCopyPaste: `00020126580014BR.GOV.BCB.PIX0136MOCK-KEY-${gatewayId}5204000053039865802BR5921DOCTON SAUDE LTDA6009SAO PAULO62070503***6304ABCD`,
                    expiresAt,
                    externalReference: params.externalReference,
                    rawResponse: { mock: true, gatewayId }
                };
            }
            case 'CREDIT_CARD': {
                expiresAt.setHours(expiresAt.getHours() + 24);
                return {
                    gatewayId,
                    status: 'PENDING',
                    method: 'CREDIT_CARD',
                    amount: params.amount,
                    paymentUrl: `https://mock-payment.docton.com.br/pay/${gatewayId}`,
                    expiresAt,
                    externalReference: params.externalReference,
                    rawResponse: { mock: true, gatewayId }
                };
            }
            case 'BOLETO': {
                expiresAt.setDate(expiresAt.getDate() + (params.dueDateDays ?? 3));
                return {
                    gatewayId,
                    status: 'PENDING',
                    method: 'BOLETO',
                    amount: params.amount,
                    paymentUrl: `https://mock-payment.docton.com.br/boleto/${gatewayId}.pdf`,
                    boletoLine: `23793.38128 60007.827136 00000.246906 8 99910000${Math.floor(params.amount * 100).toString().padStart(10, '0')}`,
                    expiresAt,
                    externalReference: params.externalReference,
                    rawResponse: { mock: true, gatewayId }
                };
            }
            default:
                throw new Error(`[PaymentGateway:Mock] Método de pagamento não suportado: ${params.method}`);
        }
    }
    async getChargeStatus(gatewayId) {
        // Em desenvolvimento: sempre retorna PENDING para simular aguardando pagamento
        console.log(`[PaymentGateway:Mock] Consultando status de ${gatewayId}`);
        return { status: 'PENDING' };
    }
    async cancelCharge(gatewayId) {
        console.log(`[PaymentGateway:Mock] Cancelando cobrança ${gatewayId}`);
    }
    validateWebhook(payload, signature) {
        // Em desenvolvimento: aceita tokens que começam com 'docton_' ou a variável de env
        const secret = process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET || 'docton_dev_secret';
        return signature === secret || signature.startsWith('docton_');
    }
    parseWebhookPayload(raw) {
        return {
            gatewayId: raw.id || raw.gatewayId || '',
            status: raw.status === 'PAID' ? 'PAID' : raw.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING',
            externalReference: raw.externalReference || raw.external_reference || '',
            paidAt: raw.paidAt ? new Date(raw.paidAt) : undefined,
            raw
        };
    }
}
// ─── Factory ───────────────────────────────────────────────────────────────────
/**
 * Retorna a instância do gateway configurado.
 *
 * Para integrar um novo gateway:
 *   1. Crie a classe que implementa `PaymentGateway`
 *   2. Adicione um case aqui com o nome do provider
 *   3. Defina PAYMENT_GATEWAY_PROVIDER no .env
 *
 * Exemplos:
 *   PAYMENT_GATEWAY_PROVIDER=stripe  → retorna StripeGateway
 *   PAYMENT_GATEWAY_PROVIDER=pagarme → retorna PagarmeGateway
 *   PAYMENT_GATEWAY_PROVIDER=mock    → retorna MockPaymentGateway (padrão dev)
 */
function createGateway() {
    const provider = process.env.PAYMENT_GATEWAY_PROVIDER?.toLowerCase() || 'mock';
    switch (provider) {
        case 'mock':
        default:
            console.log(`[PaymentGateway] Provider ativo: MockGateway. Para produção, configure PAYMENT_GATEWAY_PROVIDER.`);
            return new MockPaymentGateway();
        // Adicione novos providers aqui:
        // case 'stripe':    return new StripeGateway();
        // case 'pagarme':   return new PagarmeGateway();
        // case 'mercadopago': return new MercadoPagoGateway();
        // case 'sua_empresa': return new SeuGateway();
    }
}
exports.paymentGateway = createGateway();
//# sourceMappingURL=payment-gateway.service.js.map