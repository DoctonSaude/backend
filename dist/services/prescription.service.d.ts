export declare class PrescriptionService {
    /**
     * Cria uma receita digital associada a um parceiro e paciente
     */
    createPrescription(params: {
        patientId: string;
        partnerId: string;
        items: any[];
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        medications: import("@prisma/client/runtime/library.js").JsonValue | null;
        status: string;
        attachments: string[];
        date: Date | null;
        category: string | null;
        patientId: string;
        startDate: Date | null;
        endDate: Date | null;
        duration: string | null;
        doctor: string | null;
        partnerId: string | null;
        medication: string | null;
        dosage: string | null;
        frequency: string | null;
        instructions: string | null;
        sideEffects: string | null;
        contraindications: string | null;
        validUntil: Date | null;
    }>;
    /**
     * Assina digitalmente a receita (Stub: Campos de assinatura ausentes no schema)
     */
    signPrescription(prescriptionId: string, doctorCrm: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        medications: import("@prisma/client/runtime/library.js").JsonValue | null;
        status: string;
        attachments: string[];
        date: Date | null;
        category: string | null;
        patientId: string;
        startDate: Date | null;
        endDate: Date | null;
        duration: string | null;
        doctor: string | null;
        partnerId: string | null;
        medication: string | null;
        dosage: string | null;
        frequency: string | null;
        instructions: string | null;
        sideEffects: string | null;
        contraindications: string | null;
        validUntil: Date | null;
    }>;
    /**
     * Busca prescrições emitidas por um parceiro
     */
    getPrescriptionsByPartner(partnerId: string): Promise<({
        patient: {
            id: string;
            user: {
                name: string;
                avatar: string;
            };
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        medications: import("@prisma/client/runtime/library.js").JsonValue | null;
        status: string;
        attachments: string[];
        date: Date | null;
        category: string | null;
        patientId: string;
        startDate: Date | null;
        endDate: Date | null;
        duration: string | null;
        doctor: string | null;
        partnerId: string | null;
        medication: string | null;
        dosage: string | null;
        frequency: string | null;
        instructions: string | null;
        sideEffects: string | null;
        contraindications: string | null;
        validUntil: Date | null;
    })[]>;
}
export declare const prescriptionService: PrescriptionService;
//# sourceMappingURL=prescription.service.d.ts.map