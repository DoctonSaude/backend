import prisma from '../lib/prisma.js';
import crypto from 'crypto';
import axios from 'axios';
import { WebhookData } from '../types/common.js';

export class WebhookService {
    /**
     * Disparar webhook para todos os desenvolvedores inscritos no evento
     */
    async trigger(event: string, data: WebhookData) {
        try {
            // Buscar todos os webhooks ativos que escutam este evento
            const webhooks = await (prisma as any).webhook.findMany({
                where: {
                    isActive: true
                }
            });

            const relevantWebhooks = webhooks.filter((webhook: any) => {
                const events = JSON.parse(webhook.events);
                return events.includes(event);
            });

            if (relevantWebhooks.length === 0) {
                console.log(`No webhooks registered for event: ${event}`);
                return;
            }

            const deliveryPromises = relevantWebhooks.map((webhook: any) => this.createDelivery(webhook.id, event, data));
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
    async createDelivery(webhookId: string, event: string, data: WebhookData) {
        try {
            const payload = JSON.stringify({
                event,
                timestamp: new Date().toISOString(),
                data
            });

            const delivery = await (prisma as any).webhookDelivery.create({
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
    async processDelivery(deliveryId: string) {
        try {
            const delivery = await (prisma as any).webhookDelivery.findUnique({
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
                const response = await axios.post(webhook.url, delivery.payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': signature,
                        'X-Webhook-Event': delivery.event,
                        'User-Agent': 'HealthOS-Webhooks/1.0'
                    },
                    timeout: 10000 // 10 segundos
                });

                // Sucesso
                await (prisma as any).webhookDelivery.update({
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
            catch (error: unknown) {
                // Falha
                const statusCode = (error as any).response?.status || 0;
                const attempts = delivery.attempts + 1;
                const maxAttempts = 5;

                // Calcular próximo retry com backoff exponencial
                const nextRetryAt = this.calculateNextRetry(attempts);

                await (prisma as any).webhookDelivery.update({
                    where: { id: deliveryId },
                    data: {
                        status: attempts >= maxAttempts ? 'FAILED' : 'PENDING',
                        attempts,
                        lastAttempt: new Date(),
                        statusCode,
                        response: JSON.stringify({
                            error: (error as Error).message,
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
    generateSignature(payload: string, secret: string) {
        return crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }

    /**
     * Calcular próximo retry com backoff exponencial
     */
    calculateNextRetry(attempts: number) {
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
            const pendingDeliveries = await (prisma as any).webhookDelivery.findMany({
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

export const webhookService = new WebhookService();
