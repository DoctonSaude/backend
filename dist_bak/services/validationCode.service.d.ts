export interface ValidationCodeLogData {
    id?: string;
    code: string;
    status: string;
    timestamp?: Date | string;
    partnerId?: string | null;
    patientId?: string | null;
    appointmentId?: string | null;
    partnerName?: string | null;
    patientName?: string | null;
    errorMessage?: string | null;
}
export declare const validationCodeService: {
    getLogs: (filters: any) => Promise<{
        logs: {
            code: string;
            status: string;
            timestamp: Date;
            id: string;
            patientId: string | null;
            appointmentId: string | null;
            partnerId: string | null;
            patientName: string | null;
            partnerName: string | null;
            errorMessage: string | null;
        }[];
        pagination: {
            total: number;
            page: number;
            pageSize: number;
            totalPages: number;
        };
    }>;
    getStats: (filters: any) => Promise<{
        total: number;
        valid: number;
        invalid: number;
        errorStatus: number;
    }>;
    createLog: (data: ValidationCodeLogData) => Promise<{
        code: string;
        status: string;
        timestamp: Date;
        id: string;
        patientId: string | null;
        appointmentId: string | null;
        partnerId: string | null;
        patientName: string | null;
        partnerName: string | null;
        errorMessage: string | null;
    }>;
    updateLog: (id: string, data: Partial<ValidationCodeLogData>) => Promise<{
        code: string;
        status: string;
        timestamp: Date;
        id: string;
        patientId: string | null;
        appointmentId: string | null;
        partnerId: string | null;
        patientName: string | null;
        partnerName: string | null;
        errorMessage: string | null;
    }>;
    deleteLog: (id: string) => Promise<boolean>;
};
export default validationCodeService;
//# sourceMappingURL=validationCode.service.d.ts.map