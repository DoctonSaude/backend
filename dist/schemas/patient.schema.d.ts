import { z } from 'zod';
export declare const MedicalHistorySchema: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, Date, string>;
    type: z.ZodString;
    doctor: z.ZodString;
    specialty: z.ZodString;
    description: z.ZodString;
    diagnosis: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    treatment: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    location: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    status: z.ZodDefault<z.ZodString>;
    notes: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    attachments: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    specialty?: string;
    type?: string;
    description?: string;
    status?: string;
    attachments?: string[];
    date?: Date;
    notes?: string;
    doctor?: string;
    diagnosis?: string;
    treatment?: string;
    location?: string;
}, {
    specialty?: string;
    type?: string;
    description?: string;
    status?: string;
    attachments?: string[];
    date?: string;
    notes?: string;
    doctor?: string;
    diagnosis?: string;
    treatment?: string;
    location?: string;
}>;
export declare const AnamnesisSchema: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, Date, string>;
    chiefComplaint: z.ZodString;
    currentIllness: z.ZodString;
    familyHistory: z.ZodOptional<z.ZodString>;
    personalHistory: z.ZodOptional<z.ZodString>;
    medications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    socialHistory: z.ZodOptional<z.ZodString>;
    reviewOfSystems: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    vitalSigns: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    physicalExam: z.ZodOptional<z.ZodString>;
    assessment: z.ZodOptional<z.ZodString>;
    plan: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    allergies?: string[];
    medications?: string[];
    date?: Date;
    plan?: string;
    chiefComplaint?: string;
    currentIllness?: string;
    familyHistory?: string;
    personalHistory?: string;
    socialHistory?: string;
    reviewOfSystems?: Record<string, any>;
    vitalSigns?: Record<string, any>;
    physicalExam?: string;
    assessment?: string;
}, {
    allergies?: string[];
    medications?: string[];
    date?: string;
    plan?: string;
    chiefComplaint?: string;
    currentIllness?: string;
    familyHistory?: string;
    personalHistory?: string;
    socialHistory?: string;
    reviewOfSystems?: Record<string, any>;
    vitalSigns?: Record<string, any>;
    physicalExam?: string;
    assessment?: string;
}>;
export declare const HealthExamSchema: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, Date, string>;
    type: z.ZodString;
    name: z.ZodString;
    doctor: z.ZodOptional<z.ZodString>;
    laboratory: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    results: z.ZodOptional<z.ZodString>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    urgency: z.ZodDefault<z.ZodString>;
    fasting: z.ZodDefault<z.ZodBoolean>;
    preparation: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    type?: string;
    status?: string;
    attachments?: string[];
    date?: Date;
    doctor?: string;
    laboratory?: string;
    results?: string;
    urgency?: string;
    fasting?: boolean;
    preparation?: string;
}, {
    name?: string;
    type?: string;
    status?: string;
    attachments?: string[];
    date?: string;
    doctor?: string;
    laboratory?: string;
    results?: string;
    urgency?: string;
    fasting?: boolean;
    preparation?: string;
}>;
export declare const PrescriptionSchema: z.ZodObject<{
    date: z.ZodEffects<z.ZodOptional<z.ZodString>, Date, string>;
    medication: z.ZodString;
    dosage: z.ZodString;
    frequency: z.ZodString;
    duration: z.ZodOptional<z.ZodString>;
    instructions: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodString>;
    startDate: z.ZodEffects<z.ZodOptional<z.ZodString>, Date, string>;
    endDate: z.ZodEffects<z.ZodOptional<z.ZodString>, Date, string>;
    category: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string;
    date?: Date;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    duration?: string;
    medication?: string;
    dosage?: string;
    frequency?: string;
    instructions?: string;
}, {
    status?: string;
    date?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    duration?: string;
    medication?: string;
    dosage?: string;
    frequency?: string;
    instructions?: string;
}>;
export declare const MedicationReminderSchema: z.ZodObject<{
    medicationName: z.ZodString;
    dosage: z.ZodString;
    times: z.ZodArray<z.ZodString, "many">;
    startDate: z.ZodEffects<z.ZodString, Date, string>;
    endDate: z.ZodEffects<z.ZodNullable<z.ZodOptional<z.ZodString>>, Date, string>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    prescriptionId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean;
    startDate?: Date;
    endDate?: Date;
    notes?: string;
    dosage?: string;
    medicationName?: string;
    times?: string[];
    prescriptionId?: string;
}, {
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
    notes?: string;
    dosage?: string;
    medicationName?: string;
    times?: string[];
    prescriptionId?: string;
}>;
export declare const SubscriptionSchema: z.ZodObject<{
    planId: z.ZodString;
    paymentMethod: z.ZodString;
}, "strip", z.ZodTypeAny, {
    planId?: string;
    paymentMethod?: string;
}, {
    planId?: string;
    paymentMethod?: string;
}>;
export declare const ChangePlanSchema: z.ZodObject<{
    planId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    planId?: string;
}, {
    planId?: string;
}>;
//# sourceMappingURL=patient.schema.d.ts.map