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

import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { paymentGateway } from '../services/payment-gateway.service.js';
import { financeService } from '../services/finance.service.js';
import { SocketService } from '../lib/socket.js';
import inAppNotificationService from '../services/inAppNotification.service.js';

const router = Router();

/**
 * @route POST /api/webhooks/payment
 * Recebe eventos do gateway de pagamento.
 * NÃO requer autenticação JWT (é chamado pelo gateway externo).
 * A validação é feita via assinatura/token do gateway.
 */
router.post('/payment', async (req, res) => {
  try {
    // 1. Validar autenticidade do webhook
    const signature = (
      req.headers['asaas-access-token'] ||
      req.headers['x-gateway-signature'] ||
      req.headers['x-webhook-token'] ||
      req.headers['authorization']?.replace('Bearer ', '') ||
      ''
    ) as string;

    const isValid = paymentGateway.validateWebhook(req.body, signature);

    if (!isValid) {
      console.warn('[Webhook] Assinatura inválida recebida:', signature?.slice(0, 20));
      return res.status(401).json({ error: 'Assinatura do webhook inválida' });
    }

    // 2. Parsear o payload para o formato interno
    const event = paymentGateway.parseWebhookPayload(req.body);

    console.log(`[Webhook] Evento recebido | Gateway: ${paymentGateway.providerName} | ID: ${event.gatewayId} | Status: ${event.status}`);

    // 3. Processar apenas eventos de pagamento confirmado
    if (event.status !== 'PAID') {
      // Outros eventos (cancelled, expired) — registrar e responder 200
      console.log(`[Webhook] Evento ${event.status} ignorado (apenas PAID é processado)`);
      return res.status(200).json({ received: true, processed: false, reason: `status=${event.status}` });
    }

    // 4. Buscar a cobrança pendente (Agendamento de Consulta)
    const pendingCharge = await prisma.paymentCharge.findFirst({
      where: {
        OR: [
          { gatewayChargeId: event.gatewayId },
          { externalReference: event.externalReference || '' }
        ]
      }
    });

    // 4.B Buscar a cobrança pendente (Cotação de Farmácia)
    const pendingQuotation = await prisma.quotationPayment.findFirst({
      where: {
        OR: [
          { asaasId: event.gatewayId },
          { quotationId: event.externalReference?.replace('quotation_', '') || '' }
        ]
      },
      include: {
        QuotationRequest: true,
        QuotationResponse: {
          include: { pharmacy: { include: { User: true } } }
        }
      }
    });

    if (!pendingCharge && !pendingQuotation) {
      console.warn(`[Webhook] Cobrança não encontrada para gatewayId: ${event.gatewayId}`);
      return res.status(200).json({ received: true, processed: false, reason: 'charge_not_found' });
    }

    // --- PROCESSAMENTO PROJETO: TELEMEDICINA / CONSULTAS ---
    if (pendingCharge) {
      if (pendingCharge.status === 'PAID') {
        return res.status(200).json({ received: true, processed: false, reason: 'already_paid' });
      }

      await prisma.$transaction(async (tx) => {
        // 5a. Marcar cobrança como paga
        await (tx as any).paymentCharge.update({
          where: { id: pendingCharge.id },
          data: {
            status: 'PAID',
            paidAt: event.paidAt || new Date(),
            webhookPayload: JSON.stringify(event.raw)
          }
        });

        // 5b. Confirmar agendamento vinculado
        if (pendingCharge.appointmentId) {
          await tx.appointment.update({
            where: { id: pendingCharge.appointmentId },
            data: {
              status: 'CONFIRMED',
              notes: `Pagamento confirmado via ${paymentGateway.providerName}`,
              updatedAt: new Date(),
            },
          });

          if (pendingCharge.patientUserId) {
            SocketService.sendToUser(pendingCharge.patientUserId, 'paymentConfirmed', {
              appointmentId: pendingCharge.appointmentId,
              message: 'Pagamento confirmado! Sua consulta está agendada.',
            });
          }

          const appointment = await tx.appointment.findUnique({
            where: { id: pendingCharge.appointmentId },
            include: { partner: { select: { userId: true, name: true } } },
          });

          if (appointment?.Partner?.userId) {
            SocketService.sendToUser(appointment.Partner.userId, 'appointmentUpdate', {
              appointmentId: pendingCharge.appointmentId,
            });

            await inAppNotificationService.createNotification({
              userId: appointment.Partner.userId,
              type: 'SYSTEM',
              title: 'Novo Agendamento Pago',
              message: `Pagamento confirmado para a consulta do dia ${appointment.dateTime ? new Date(appointment.dateTime).toLocaleDateString('pt-BR') : ''}.`,
              priority: 'high',
              link: '/partner/agenda',
            });
          }
        }

        // 5b2. Confirmar pedidos de farmácia vinculados
        try {
          const meta = pendingCharge.metadata ? JSON.parse(pendingCharge.metadata) : {};
          const orderIds: string[] = meta.pharmacyOrderIds || [];
          for (const orderId of orderIds) {
            await tx.pharmacyOrder.update({
              where: { id: orderId },
              data: { status: 'RECEIVED', updatedAt: new Date() },
            });
          }
          if (orderIds.length && pendingCharge.patientUserId) {
            SocketService.sendToUser(pendingCharge.patientUserId, 'pharmacyOrderPaid', {
              orderIds,
              message: 'Pagamento confirmado! Sua farmácia vai preparar o pedido.',
            });
          }
        } catch (metaErr) {
          console.warn('[Webhook] Erro ao confirmar pedidos de farmácia:', metaErr);
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

      console.log(`[Webhook] Consulta: Pagamento ${event.gatewayId} processado com sucesso!`);
      return res.status(200).json({ received: true, processed: true });
    }

    // --- PROCESSAMENTO PROJETO: COTAÇÕES DE FARMÁCIA ---
    if (pendingQuotation) {
      if (pendingQuotation.status === 'PAID') {
        return res.status(200).json({ received: true, processed: false, reason: 'already_paid' });
      }

      await prisma.$transaction(async (tx) => {
        // Atualiza pagamento
        await tx.quotationPayment.update({
          where: { id: pendingQuotation.id },
          data: { status: 'PAID' }
        });
        
        // Atualiza solicitação
        await tx.quotationRequest.update({
          where: { id: pendingQuotation.quotationId },
          data: { status: 'ACCEPTED' }
        });
        
        // Atualiza resposta ganhadora
        await tx.quotationResponse.update({
          where: { id: pendingQuotation.responseId },
          data: { status: 'ACCEPTED' }
        });
      });

      // Notificar Farmácia Vencedora
      const pharmacyUsers = pendingQuotation.QuotationResponse?.Pharmacy?.User || [];
      for (const pharmacyUser of pharmacyUsers) {
        await inAppNotificationService.createNotification({
          userId: pharmacyUser.id,
          type: 'SYSTEM',
          title: 'Venda de Cotação Confirmada! 🎉',
          message: `O pagamento da cotação para ${pendingQuotation.QuotationRequest?.medicamentName} foi confirmado pelo paciente! Acesse "Cotações Fechadas" para despachar o pedido.`,
          priority: 'critical',
          link: '/pharmacy/cotacoes?view=fechadas'
        });
      }

      // Notificar Admin
      await inAppNotificationService.createNotification({
        userId: null,
        type: 'SYSTEM',
        title: 'Cotação Paga e Finalizada',
        message: `Uma cotação de ${pendingQuotation.QuotationRequest?.medicamentName} foi paga. Farmácia: ${pendingQuotation.QuotationResponse?.Pharmacy?.name}.`,
        priority: 'high',
        link: '/admin/orcamentos'
      });

      console.log(`[Webhook] Cotação Farmácia: Pagamento ${event.gatewayId} processado com sucesso!`);
      return res.status(200).json({ received: true, processed: true, type: 'quotation' });
    }

  } catch (error) {
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
    provider: paymentGateway.providerName,
    timestamp: new Date().toISOString()
  });
});

export default router;
