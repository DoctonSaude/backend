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
        attachments: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        diagnosis: string;
        treatment: string | null;
        appointmentId: string;
        partnerId: string;
        txHash: string | null;
        symptoms: string | null;
        symptomsArray: string[];
        observations: string | null;
        attachmentsArray: string[];
        ipfsHash: string | null;
        isSealed: boolean;
    }>;
    /**
     * Busca o histórico completo do paciente (Lock-in Emocional/Dados)
     */
    getPatientHistory(patientId: string, accessor?: {
        id: string;
        role: string;
    }): Promise<{
        attachments: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        diagnosis: string;
        treatment: string | null;
        appointmentId: string;
        partnerId: string;
        txHash: string | null;
        symptoms: string | null;
        symptomsArray: string[];
        observations: string | null;
        attachmentsArray: string[];
        ipfsHash: string | null;
        isSealed: boolean;
    }[]>;
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