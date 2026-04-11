"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookService = exports.WebhookService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
class WebhookService {
    /**
     * Disparar webhook para todos os desenvolvedores inscritos no evento
     */
    async trigger(event, data) {
        try {
            // Buscar todos os webhooks ativos que escutam este evento
            const webhooks = await prisma_js_1.default.webhook.findMany({
                where: {
                    isActive: true
                }
            });
            const relevantWebhooks = webhooks.filter((webhook) => {
                const events = JSON.parse(webhook.events);
                return events.includes(event);
            });
            if (relevantWebhooks.length === 0) {
                console.log(`No webhooks registered for event: ${event}`);
                return;
            }
            const deliveryPromises = relevantWebhooks.map((webhook) => this.createDelivery(webhook.id, event, data));
            await Promise.all(deliveryPromises);
            console.log(`Triggered ${relevantWebhooks.length} webhooks for event: ${event}`);
        }
        catch (error) {
            console.error('Error triggering webhooks:', error);
        }
    }
    /**
     * Criar delivery e processar imediatamente
     */
    async createDelivery(webhookId, event, data) {
        try {
            const payload = JSON.stringify({
                event,
                timestamp: new Date().toISOString(),
                data
            });
            const delivery = await prisma_js_1.default.webhookDelivery.create({
                data: {
                    webhookId,
                    event,
                    payload,
                    status: 'PENDING'
                }
            });
            // Processar imediatamente (em produção, usar queue)
            await this.processDelivery(delivery.id);
        }
        catch (error) {
            console.error('Error creating delivery:', error);
        }
    }
    /**
     * Processar delivery (enviar HTTP request)
     */
    async processDelivery(deliveryId) {
        try {
            const delivery = await prisma_js_1.default.webhookDelivery.findUnique({
                where: { id: deliveryId },
                include: { webhook: true }
            });
            if (!delivery) {
                console.error(`Delivery not found: ${deliveryId}`);
                return;
            }
            const { webhook } = delivery;
            // Gerar assinatura HMAC
            const signature = this.generateSignature(delivery.payload, webhook.secret);
            // Enviar HTTP POST
            try {
                const response = await axios_1.default.post(webhook.url, delivery.payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': signature,
                        'X-Webhook-Event': delivery.event,
                        'User-Agent': 'HealthOS-Webhooks/1.0'
                    },
                    timeout: 10000 // 10 segundos
                });
                // Sucesso
                await prisma_js_1.default.webhookDelivery.update({
                    where: { id: deliveryId },
                    data: {
                        status: 'SUCCESS',
                        attempts: delivery.attempts + 1,
                        lastAttempt: new Date(),
                        statusCode: response.status,
                        response: JSON.stringify({
                            status: response.status,
                            data: response.data
                        })
                    }
                });
                console.log(`Webhook delivered successfully: ${deliveryId}`);
            }
            catch (error) {
                // Falha
                const statusCode = error.response?.status || 0;
                const attempts = delivery.attempts + 1;
                const maxAttempts = 5;
                // Calcular próximo retry com backoff exponencial
                const nextRetryAt = this.calculateNextRetry(attempts);
                await prisma_js_1.default.webhookDelivery.update({
                    where: { id: deliveryId },
                    data: {
                        status: attempts >= maxAttempts ? 'FAILED' : 'PENDING',
                        attempts,
                        lastAttempt: new Date(),
                        statusCode,
                        response: JSON.stringify({
                            error: error.message,
                            status: statusCode
                        }),
                        nextRetryAt: attempts < maxAttempts ? nextRetryAt : null
                    }
                });
                if (attempts < maxAttempts) {
                    console.log(`Webhook delivery failed, will retry: ${deliveryId} (attempt ${attempts}/${maxAttempts})`);
                    // Em produção, agendar retry na queue
                }
                else {
                    console.error(`Webhook delivery failed permanently: ${deliveryId}`);
                }
            }
        }
        catch (error) {
            console.error('Error processing delivery:', error);
        }
    }
    /**
     * Gerar assinatura HMAC SHA-256
     */
    generateSignature(payload, secret) {
        return crypto_1.default
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }
    /**
     * Calcular próximo retry com backoff exponencial
     */
    calculateNextRetry(attempts) {
        // Backoff: 1min, 5min, 15min, 1h, 6h
        const delays = [60, 300, 900, 3600, 21600]; // em segundos
        const delay = delays[Math.min(attempts - 1, delays.length - 1)];
        const nextRetry = new Date();
        nextRetry.setSeconds(nextRetry.getSeconds() + delay);
        return nextRetry;
    }
    /**
     * Processar deliveries pendentes (para cron job)
     */
    async processRetries() {
        try {
            const now = new Date();
            const pendingDeliveries = await prisma_js_1.default.webhookDelivery.findMany({
                where: {
                    status: 'PENDING',
                    nextRetryAt: {
                        lte: now
                    }
                },
                take: 100
            });
            console.log(`Processing ${pendingDeliveries.length} pending webhook deliveries`);
            for (const delivery of pendingDeliveries) {
                await this.processDelivery(delivery.id);
            }
        }
        catch (error) {
            console.error('Error processing retries:', error);
        }
    }
}
exports.WebhookService = WebhookService;
exports.webhookService = new WebhookService();
//# sourceMappingURL=webhook.service.js.map