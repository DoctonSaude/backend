export declare class PrescriptionService {
    /**
     * Cria uma receita digital associada a um parceiro e paciente
     */
    createPrescription(params: {
        patientId: string;
        partnerId: string;
        items: any[];
    }): Promise<{
        status: string;
        attachments: string[];
        date: Date | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        doctor: string | null;
        medications: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
        medication: string | null;
        dosage: string | null;
        frequency: string | null;
        duration: string | null;
        instructions: string | null;
        startDate: Date | null;
        endDate: Date | null;
        category: string | null;
        partnerId: string | null;
        sideEffects: string | null;
        contraindications: string | null;
        validUntil: Date | null;
    }>;
    /**
     * Assina digitalmente a receita (Stub: Campos de assinatura ausentes no schema)
     */
    signPrescription(prescriptionId: string, doctorCrm: string): Promise<{
        status: string;
        attachments: string[];
        date: Date | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        doctor: string | null;
        medications: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
        medication: string | null;
        dosage: string | null;
        frequency: string | null;
        duration: string | null;
        instructions: string | null;
        startDate: Date | null;
        endDate: Date | null;
        category: string | null;
        partnerId: string | null;
        sideEffects: string | null;
        contraindications: string | null;
        validUntil: Date | null;
    }>;
    /**
     * Busca prescrições emitidas por um parceiro
     */
    getPrescriptionsByPartner(partnerId: string): Promise<{
        status: string;
        attachments: string[];
        date: Date | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        doctor: string | null;
        medications: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
        medication: string | null;
        dosage: string | null;
        frequency: string | null;
        duration: string | null;
        instructions: string | null;
        startDate: Date | null;
        endDate: Date | null;
        category: string | null;
        partnerId: string | null;
        sideEffects: string | null;
        contraindications: string | null;
        validUntil: Date | null;
    }[]>;
}
export declare const prescriptionService: PrescriptionService;
//# sourceMappingURL=prescription.service.d.ts.map