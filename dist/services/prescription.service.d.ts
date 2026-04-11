export declare class PrescriptionService {
    /**
     * Cria uma receita digital associada a um atendimento
     */
    createPrescription(params: {
        appointmentId: string;
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
        appointmentId: string | null;
        content: string | null;
        signature: string | null;
        signedAt: Date | null;
        isDigital: boolean;
    }>;
    /**
     * Assina digitalmente a receita (MOCK ICP-Brasil simulado)
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
        appointmentId: string | null;
        content: string | null;
        signature: string | null;
        signedAt: Date | null;
        isDigital: boolean;
    }>;
    /**
     * Busca prescrições emitidas por um parceiro
     */
    getPrescriptionsByPartner(partnerId: string): Promise<({
        patient: {
            id: string;
            person: {
                name: string;
                avatar: string;
            };
            user: {
                name: string;
                avatar: string;
            };
        };
        appointment: {
            id: string;
            dateTime: Date;
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
        appointmentId: string | null;
        content: string | null;
        signature: string | null;
        signedAt: Date | null;
        isDigital: boolean;
    })[]>;
}
export declare const prescriptionService: PrescriptionService;
//# sourceMappingURL=prescription.service.d.ts.map