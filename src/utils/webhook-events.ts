import { webhookService } from '../services/webhook.service.js';
import { AppointmentData, HealthLogData, PatientChallengeData, PatientBadgeData, PaymentData } from '../types/common.js';

/**
 * Helper para disparar webhooks em eventos do sistema
 */

/**
 * Disparar webhook quando agendamento é criado
 */
export async function onAppointmentCreated(appointment: AppointmentData) {
    await webhookService.trigger('appointment.created', {
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
export async function onAppointmentUpdated(appointment: AppointmentData) {
    await webhookService.trigger('appointment.updated', {
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
export async function onAppointmentCancelled(appointment: AppointmentData) {
    await webhookService.trigger('appointment.cancelled', {
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
export async function onHealthLogCreated(healthLog: HealthLogData) {
    await webhookService.trigger('healthlog.created', {
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
export async function onChallengeCompleted(patientchallenge: PatientChallengeData) {
    await webhookService.trigger('challenge.completed', {
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
export async function onBadgeEarned(patientBadge: PatientBadgeData) {
    await webhookService.trigger('badge.earned', {
        id: patientBadge.id,
        patientId: patientBadge.patientId,
        badgeId: patientBadge.badgeId,
        earnedAt: patientBadge.earnedAt
    });
}

/**
 * Disparar webhook quando pagamento é completado
 */
export async function onPaymentCompleted(payment: PaymentData) {
    await webhookService.trigger('payment.completed', {
        id: payment.id,
        patientId: payment.patientId,
        partnerId: payment.partnerId,
        amount: payment.amount,
        status: payment.status,
        method: payment.method
    });
}
