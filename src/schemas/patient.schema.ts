import { z } from 'zod';

export const MedicalHistorySchema = z.object({
    date: z.string().transform(val => new Date(val)),
    type: z.string().min(1, 'Tipo é obrigatório'),
    doctor: z.string().min(1, 'Médico é obrigatório'),
    specialty: z.string().min(1, 'Especialidade é obrigatória'),
    description: z.string().min(1, 'Descrição é obrigatória'),
    diagnosis: z.string().optional().nullable().or(z.literal('')),
    treatment: z.string().optional().nullable().or(z.literal('')),
    location: z.string().optional().nullable().or(z.literal('')),
    status: z.string().default('Concluído'),
    notes: z.string().optional().nullable().or(z.literal('')),
    attachments: z.array(z.string()).optional().default([]),
});

export const AnamnesisSchema = z.object({
    date: z.string().transform(val => new Date(val)),
    chiefComplaint: z.string().min(1, 'Queixa principal é obrigatória'),
    currentIllness: z.string().min(1, 'Histórico da doença atual é obrigatório'),
    familyHistory: z.string().optional(),
    personalHistory: z.string().optional(),
    medications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    socialHistory: z.string().optional(),
    reviewOfSystems: z.record(z.any()).optional(),
    vitalSigns: z.record(z.any()).optional(),
    physicalExam: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),
});

export const HealthExamSchema = z.object({
    date: z.string().transform(val => new Date(val)),
    type: z.string().min(1, 'Tipo é obrigatório'),
    name: z.string().min(1, 'Nome do exame é obrigatório'),
    doctor: z.string().optional(),
    laboratory: z.string().optional(),
    status: z.string().min(1, 'Status é obrigatório'),
    results: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    urgency: z.string().default('Normal'),
    fasting: z.boolean().default(false),
    preparation: z.string().optional(),
});

export const PrescriptionSchema = z.object({
    date: z.string().optional().transform(val => val ? new Date(val) : new Date()),
    medication: z.string().min(1, 'Medicamento é obrigatório'),
    dosage: z.string().min(1, 'Dosagem é obrigatória'),
    frequency: z.string().min(1, 'Frequência é obrigatória'),
    duration: z.string().optional(),
    instructions: z.string().optional(),
    status: z.string().default('Ativo'),
    startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    category: z.string().optional(),
});

export const MedicationReminderSchema = z.object({
    medicationName: z.string().min(1, 'Nome do medicamento é obrigatório'),
    dosage: z.string().min(1, 'Dosagem é obrigatória'),
    times: z.array(z.string()).min(1, 'Pelo menos um horário é obrigatório'),
    startDate: z.string().transform(val => new Date(val)),
    endDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
    isActive: z.boolean().default(true),
    notes: z.string().optional().nullable(),
    prescriptionId: z.string().optional().nullable(),
});

export const SubscriptionSchema = z.object({
    planId: z.string().min(1, 'ID do plano é obrigatório'),
    paymentMethod: z.string().min(1, 'Método de pagamento é obrigatório'),
});

export const ChangePlanSchema = z.object({
    planId: z.string().min(1, 'ID do plano é obrigatório'),
});

