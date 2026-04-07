export declare class MedicalRecordService {
    /**
     * Cria um prontuário estruturado baseado em template
     */
    createMedicalRecord(params: {
        appointmentId: string;
        patientId: string;
        partnerId: string;
        diagnosis?: string;
        symptoms?: string;
        treatment?: string;
        observations?: string;
        structuredData?: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        attachments: string | null;
        patientId: string;
        diagnosis: string;
        treatment: string | null;
        partnerId: string;
        appointmentId: string;
        symptoms: string | null;
        symptomsArray: string[];
        observations: string | null;
        attachmentsArray: string[];
        ipfsHash: string | null;
        txHash: string | null;
        isSealed: boolean;
    }>;
    /**
     * Busca o histórico completo do paciente (Lock-in Emocional/Dados)
     */
    getPatientHistory(patientId: string, accessor?: {
        id: string;
        role: string;
    }): Promise<({
        partner: {
            person: {
                id: string;
                name: string;
                phone: string | null;
                avatar: string | null;
                createdAt: Date;
                updatedAt: Date;
                metadata: string | null;
            };
        } & {
            type: string;
            description: string | null;
            id: string;
            personId: string | null;
            name: string | null;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string | null;
            userId: string | null;
            photo: string | null;
            crm: string | null;
            specialty: string | null;
            specialties: string[];
            institution: string | null;
            experience: number | null;
            experienceYears: number | null;
            rating: number | null;
            totalReviews: number;
            verified: boolean;
            isApproved: boolean;
            rejectionReason: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
            lat: number | null;
            lng: number | null;
            acceptsEmergency: boolean;
            acceptsInsurance: boolean;
            acceptsOnline: boolean;
            acceptsTelemedicine: boolean;
            cnpj: string | null;
            consultationPrice: number | null;
            education: import("../../lib/generated/prisma/runtime/library.js").JsonValue | null;
            facilities: string[];
            foundationYear: number | null;
            insurances: string[];
            languages: string[];
            settings: import("../../lib/generated/prisma/runtime/library.js").JsonValue | null;
            workingHours: import("../../lib/generated/prisma/runtime/library.js").JsonValue | null;
            planTier: string;
            planStatus: string;
            planExpiresAt: Date | null;
            happyHourConfig: import("../../lib/generated/prisma/runtime/library.js").JsonValue | null;
        };
        appointment: {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            commissionPercent: number | null;
            patientId: string;
            duration: number | null;
            notes: string | null;
            partnerId: string | null;
            dateTime: Date | null;
            isOnline: boolean;
            meetingLink: string | null;
            roomId: string | null;
            equipmentId: string | null;
            professionalId: string | null;
            doctonFee: number | null;
            partnerNetPrice: number | null;
            availableAt: Date | null;
            payoutStatus: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        attachments: string | null;
        patientId: string;
        diagnosis: string;
        treatment: string | null;
        partnerId: string;
        appointmentId: string;
        symptoms: string | null;
        symptomsArray: string[];
        observations: string | null;
        attachmentsArray: string[];
        ipfsHash: string | null;
        txHash: string | null;
        isSealed: boolean;
    })[]>;
    /**
     * Sistema de Auditoria Médica (Conformidade CFM/LGPD)
     */
    logAccess(params: {
        medicalRecordId: string;
        accessorId: string;
        accessorRole: string;
        action: string;
        metadata?: any;
    }): Promise<void>;
}
export declare const medicalRecordService: MedicalRecordService;
//# sourceMappingURL=medical-record.service.d.ts.map