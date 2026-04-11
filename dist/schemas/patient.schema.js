"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangePlanSchema = exports.SubscriptionSchema = exports.MedicationReminderSchema = exports.PrescriptionSchema = exports.HealthExamSchema = exports.AnamnesisSchema = exports.MedicalHistorySchema = void 0;
const zod_1 = require("zod");
exports.MedicalHistorySchema = zod_1.z.object({
    date: zod_1.z.string().transform(val => new Date(val)),
    type: zod_1.z.string().min(1, 'Tipo é obrigatório'),
    doctor: zod_1.z.string().min(1, 'Médico é obrigatório'),
    specialty: zod_1.z.string().min(1, 'Especialidade é obrigatória'),
    description: zod_1.z.string().min(1, 'Descrição é obrigatória'),
    diagnosis: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    treatment: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    location: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    status: zod_1.z.string().default('Concluído'),
    notes: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    attachments: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
exports.AnamnesisSchema = zod_1.z.object({
    date: zod_1.z.string().transform(val => new Date(val)),
    chiefComplaint: zod_1.z.string().min(1, 'Queixa principal é obrigatória'),
    currentIllness: zod_1.z.string().min(1, 'Histórico da doença atual é obrigatório'),
    familyHistory: zod_1.z.string().optional(),
    personalHistory: zod_1.z.string().optional(),
    medications: zod_1.z.array(zod_1.z.string()).optional(),
    allergies: zod_1.z.array(zod_1.z.string()).optional(),
    socialHistory: zod_1.z.string().optional(),
    reviewOfSystems: zod_1.z.record(zod_1.z.any()).optional(),
    vitalSigns: zod_1.z.record(zod_1.z.any()).optional(),
    physicalExam: zod_1.z.string().optional(),
    assessment: zod_1.z.string().optional(),
    plan: zod_1.z.string().optional(),
});
exports.HealthExamSchema = zod_1.z.object({
    date: zod_1.z.string().transform(val => new Date(val)),
    type: zod_1.z.string().min(1, 'Tipo é obrigatório'),
    name: zod_1.z.string().min(1, 'Nome do exame é obrigatório'),
    doctor: zod_1.z.string().optional(),
    laboratory: zod_1.z.string().optional(),
    status: zod_1.z.string().min(1, 'Status é obrigatório'),
    results: zod_1.z.string().optional(),
    attachments: zod_1.z.array(zod_1.z.string()).optional(),
    urgency: zod_1.z.string().default('Normal'),
    fasting: zod_1.z.boolean().default(false),
    preparation: zod_1.z.string().optional(),
});
exports.PrescriptionSchema = zod_1.z.object({
    date: zod_1.z.string().optional().transform(val => val ? new Date(val) : new Date()),
    medication: zod_1.z.string().min(1, 'Medicamento é obrigatório'),
    dosage: zod_1.z.string().min(1, 'Dosagem é obrigatória'),
    frequency: zod_1.z.string().min(1, 'Frequência é obrigatória'),
    duration: zod_1.z.string().optional(),
    instructions: zod_1.z.string().optional(),
    status: zod_1.z.string().default('Ativo'),
    startDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
    endDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
    category: zod_1.z.string().optional(),
});
exports.MedicationReminderSchema = zod_1.z.object({
    medicationName: zod_1.z.string().min(1, 'Nome do medicamento é obrigatório'),
    dosage: zod_1.z.string().min(1, 'Dosagem é obrigatória'),
    times: zod_1.z.array(zod_1.z.string()).min(1, 'Pelo menos um horário é obrigatório'),
    startDate: zod_1.z.string().transform(val => new Date(val)),
    endDate: zod_1.z.string().optional().nullable().transform(val => val ? new Date(val) : null),
    isActive: zod_1.z.boolean().default(true),
    notes: zod_1.z.string().optional().nullable(),
    prescriptionId: zod_1.z.string().optional().nullable(),
});
exports.SubscriptionSchema = zod_1.z.object({
    planId: zod_1.z.string().min(1, 'ID do plano é obrigatório'),
    paymentMethod: zod_1.z.string().min(1, 'Método de pagamento é obrigatório'),
});
exports.ChangePlanSchema = zod_1.z.object({
    planId: zod_1.z.string().min(1, 'ID do plano é obrigatório'),
});
//# sourceMappingURL=patient.schema.js.map