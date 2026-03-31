export declare class PrescriptionService {
    /**
     * Cria uma receita digital associada a um atendimento
     */
    createPrescription(params: {
        appointmentId: string;
        patientId: string;
        items: any[];
    }): Promise<any>;
    /**
     * Assina digitalmente a receita (MOCK ICP-Brasil)
     */
    signPrescription(prescriptionId: string, doctorCrm: string): Promise<any>;
}
export declare const prescriptionService: PrescriptionService;
//# sourceMappingURL=prescription.service.d.ts.map