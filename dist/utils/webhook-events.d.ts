import { AppointmentData, HealthLogData, PatientChallengeData, PatientBadgeData, PaymentData } from '../types/common.js';
/**
 * Helper para disparar webhooks em eventos do sistema
 */
/**
 * Disparar webhook quando agendamento é criado
 */
export declare function onAppointmentCreated(appointment: AppointmentData): Promise<void>;
/**
 * Disparar webhook quando agendamento é atualizado
 */
export declare function onAppointmentUpdated(appointment: AppointmentData): Promise<void>;
/**
 * Disparar webhook quando agendamento é cancelado
 */
export declare function onAppointmentCancelled(appointment: AppointmentData): Promise<void>;
/**
 * Disparar webhook quando registro de saúde é criado
 */
export declare function onHealthLogCreated(healthLog: HealthLogData): Promise<void>;
/**
 * Disparar webhook quando desafio é completado
 */
export declare function onChallengeCompleted(patientChallenge: PatientChallengeData): Promise<void>;
/**
 * Disparar webhook quando badge é conquistado
 */
export declare function onBadgeEarned(patientBadge: PatientBadgeData): Promise<void>;
/**
 * Disparar webhook quando pagamento é completado
 */
export declare function onPaymentCompleted(payment: PaymentData): Promise<void>;
//# sourceMappingURL=webhook-events.d.ts.map