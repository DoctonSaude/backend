"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAppointmentCreated = onAppointmentCreated;
exports.onAppointmentUpdated = onAppointmentUpdated;
exports.onAppointmentCancelled = onAppointmentCancelled;
exports.onHealthLogCreated = onHealthLogCreated;
exports.onChallengeCompleted = onChallengeCompleted;
exports.onBadgeEarned = onBadgeEarned;
exports.onPaymentCompleted = onPaymentCompleted;
const webhook_service_js_1 = require("../services/webhook.service.js");
/**
 * Helper para disparar webhooks em eventos do sistema
 */
/**
 * Disparar webhook quando agendamento é criado
 */
async function onAppointmentCreated(appointment) {
    await webhook_service_js_1.webhookService.trigger('appointment.created', {
        id: appointment.id,
        patientId: appointment.patientId,
        partnerId: appointment.partnerId,
        dateTime: appointment.dateTime,
        service: appointment.service,
        status: appointment.status
    });
}
/**
 * Disparar webhook quando agendamento é atualizado
 */
async function onAppointmentUpdated(appointment) {
    await webhook_service_js_1.webhookService.trigger('appointment.updated', {
        id: appointment.id,
        patientId: appointment.patientId,
        partnerId: appointment.partnerId,
        dateTime: appointment.dateTime,
        service: appointment.service,
        status: appointment.status
    });
}
/**
 * Disparar webhook quando agendamento é cancelado
 */
async function onAppointmentCancelled(appointment) {
    await webhook_service_js_1.webhookService.trigger('appointment.cancelled', {
        id: appointment.id,
        patientId: appointment.patientId,
        partnerId: appointment.partnerId,
        dateTime: appointment.dateTime,
        service: appointment.service,
        status: appointment.status
    });
}
/**
 * Disparar webhook quando registro de saúde é criado
 */
async function onHealthLogCreated(healthLog) {
    await webhook_service_js_1.webhookService.trigger('healthlog.created', {
        id: healthLog.id,
        patientId: healthLog.patientId,
        type: healthLog.type,
        value: healthLog.value,
        timestamp: healthLog.timestamp
    });
}
/**
 * Disparar webhook quando desafio é completado
 */
async function onChallengeCompleted(patientChallenge) {
    await webhook_service_js_1.webhookService.trigger('challenge.completed', {
        id: patientChallenge.id,
        patientId: patientChallenge.patientId,
        challengeId: patientChallenge.challengeId,
        status: patientChallenge.status,
        completedAt: patientChallenge.completedAt
    });
}
/**
 * Disparar webhook quando badge é conquistado
 */
async function onBadgeEarned(patientBadge) {
    await webhook_service_js_1.webhookService.trigger('badge.earned', {
        id: patientBadge.id,
        patientId: patientBadge.patientId,
        badgeId: patientBadge.badgeId,
        earnedAt: patientBadge.earnedAt
    });
}
/**
 * Disparar webhook quando pagamento é completado
 */
async function onPaymentCompleted(payment) {
    await webhook_service_js_1.webhookService.trigger('payment.completed', {
        id: payment.id,
        patientId: payment.patientId,
        partnerId: payment.partnerId,
        amount: payment.amount,
        status: payment.status,
        method: payment.method
    });
}
//# sourceMappingURL=webhook-events.js.map