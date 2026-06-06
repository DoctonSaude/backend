"use strict";
// @ts-nocheck
/**
 * ============================================================
 *  DOCTON SAÚDE — Webhook Handler do Gateway de Pagamento
 * ============================================================
 *
 * Este handler recebe e processa eventos de confirmação de
 * pagamento enviados pelo gateway externo.
 *
 * URL: POST /api/webhooks/payment
 *
 * Configure no painel do gateway o destino:
 *   https://api.docton.com.br/api/webhooks/payment
 *
 * Cabeçalho esperado:
 *   x-gateway-signature: <token ou HMAC enviado pelo gateway>
 * ============================================================
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const payment_gateway_service_js_1 = require("../services/payment-gateway.service.js");
const socket_js_1 = require("../lib/socket.js");
const inAppNotification_service_js_1 = __importDefault(require("../services/inAppNotification.service.js"));
const router = (0, express_1.Router)();
/**
 * @route POST /api/webhooks/payment
 * Recebe eventos do gateway de pagamento.
 * NÃO requer autenticação JWT (é chamado pelo gateway externo).
 * A validação é feita via assinatura/token do gateway.
 */
router.post('/payment', async (req, res) => {
    try {
        // 1. Validar autenticidade do webhook
        const signature = (req.headers['x-gateway-signature'] ||
            req.headers['x-webhook-token'] ||
            req.headers['authorization']?.replace('Bearer ', '') ||
            '');
        const isValid = payment_gateway_service_js_1.paymentGateway.validateWebhook(req.body, signature);
        if (!isValid) {
            console.warn('[Webhook] Assinatura inválida recebida:', signature?.slice(0, 20));
            return res.status(401).json({ error: 'Assinatura do webhook inválida' });
        }
        // 2. Parsear o payload para o formato interno
        const event = payment_gateway_service_js_1.paymentGateway.parseWebhookPayload(req.body);
        console.log(`[Webhook] Evento recebido | Gateway: ${payment_gateway_service_js_1.paymentGateway.providerName} | ID: ${event.gatewayId} | Status: ${event.status}`);
        // 3. Processar apenas eventos de pagamento confirmado
        if (event.status !== 'PAID') {
            // Outros eventos (cancelled, expired) — registrar e responder 200
            console.log(`[Webhook] Evento ${event.status} ignorado (apenas PAID é processado)`);
            return res.status(200).json({ received: true, processed: false, reason: `status=${event.status}` });
        }
        // 4. Buscar a cobrança pendente usando o gatewayId ou externalReference
        const pendingCharge = await prisma_js_1.default.paymentCharge.findFirst({
            where: {
                OR: [
                    { gatewayChargeId: event.gatewayId },
                    { externalReference: event.externalReference || '' }
                ],
                status: 'PENDING'
            }
        });
        if (!pendingCharge) {
            console.warn(`[Webhook] Cobrança não encontrada para gatewayId: ${event.gatewayId}`);
            // Retornar 200 mesmo assim — o gateway não deve reenviar entregas confirmadas
            return res.status(200).json({ received: true, processed: false, reason: 'charge_not_found' });
        }
        // 5. Atualizar a cobrança para PAID em transação atômica
        await prisma_js_1.default.$transaction(async (tx) => {
            // 5a. Marcar cobrança como paga
            await tx.paymentCharge.update({
                where: { id: pendingCharge.id },
                data: {
                    status: 'PAID',
                    paidAt: event.paidAt || new Date(),
                    webhookPayload: JSON.stringify(event.raw)
                }
            });
            // 5b. Se há agendamento vinculado, confirmar e processar o repasse
            if (pendingCharge.appointmentId) {
                await tx.appointment.update({
                    where: { id: pendingCharge.appointmentId },
                    data: {
                        status: 'CONFIRMED',
                        notes: `Pagamento confirmado via ${payment_gateway_service_js_1.paymentGateway.providerName}`
                    }
                });
                // Notificar paciente via Socket
                if (pendingCharge.patientUserId) {
                    socket_js_1.SocketService.sendToUser(pendingCharge.patientUserId, 'paymentConfirmed', {
                        appointmentId: pendingCharge.appointmentId,
                        message: 'Pagamento confirmado! Sua consulta está agendada.'
                    });
                }
                // Notificar parceiro
                const appointment = await tx.appointment.findUnique({
                    where: { id: pendingCharge.appointmentId },
                    include: { partner: { select: { userId: true, name: true } } }
                });
                if (appointment?.partner?.userId) {
                    socket_js_1.SocketService.sendToUser(appointment.partner.userId, 'appointmentUpdate', {
                        appointmentId: pendingCharge.appointmentId
                    });
                    await inAppNotification_service_js_1.default.createNotification({
                        userId: appointment.partner.userId,
                        type: 'SYSTEM',
                        title: 'Novo Agendamento Pago',
                        message: `Pagamento confirmado para a consulta do dia ${new Date(appointment.dateTime).toLocaleDateString('pt-BR')}.`,
                        priority: 'high',
                        link: '/partner/agenda'
                    });
                }
            }
            // 5c. Registrar transação financeira do paciente (entrada no sistema)
            if (pendingCharge.patientId) {
                await tx.transaction.create({
                    data: {
                        patientId: pendingCharge.patientId,
                        type: 'INCOME',
                        amount: pendingCharge.amount,
                        description: `Pagamento confirmado - ${pendingCharge.description}`,
                        status: 'COMPLETED',
                        category: 'PAYMENT',
                        metadata: JSON.stringify({
                            gatewayId: event.gatewayId,
                            method: pendingCharge.paymentMethod,
                            appointmentId: pendingCharge.appointmentId
                        })
                    }
                });
            }
        });
        console.log(`[Webhook] Pagamento ${event.gatewayId} processado com sucesso!`);
        return res.status(200).json({ received: true, processed: true });
    }
    catch (error) {
        console.error('[Webhook] Erro ao processar evento de pagamento:', error);
        // IMPORTANTE: Retornar 500 para que o gateway reenvie o webhook
        return res.status(500).json({ error: 'Erro interno ao processar webhook' });
    }
});
/**
 * @route GET /api/webhooks/payment/health
 * Health check para verificar se o webhook está acessível.
 */
router.get('/payment/health', (_req, res) => {
    res.json({
        status: 'ok',
        provider: payment_gateway_service_js_1.paymentGateway.providerName,
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
//# sourceMappingURL=webhook.routes.js.map