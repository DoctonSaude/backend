import { WebhookData } from '../types/common.js';
export declare class WebhookService {
    /**
     * Disparar webhook para todos os desenvolvedores inscritos no evento
     */
    trigger(event: string, data: WebhookData): Promise<void>;
    /**
     * Criar delivery e processar imediatamente
     */
    createDelivery(webhookId: string, event: string, data: WebhookData): Promise<void>;
    /**
     * Processar delivery (enviar HTTP request)
     */
    processDelivery(deliveryId: string): Promise<void>;
    /**
     * Gerar assinatura HMAC SHA-256
     */
    generateSignature(payload: string, secret: string): string;
    /**
     * Calcular próximo retry com backoff exponencial
     */
    calculateNextRetry(attempts: number): Date;
    /**
     * Processar deliveries pendentes (para cron job)
     */
    processRetries(): Promise<void>;
}
export declare const webhookService: WebhookService;
//# sourceMappingURL=webhook.service.d.ts.map