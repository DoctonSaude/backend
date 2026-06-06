export declare class AppointmentService {
    /**
     * Cria um agendamento com validação 3D (Profissional, Sala, Equipamento)
     * e gera necessidade de micro-depósito.
     */
    createAppointment(params: {
        patientId: string;
        partnerId: string;
        dateTime: Date;
        duration: number;
        roomId?: string;
        equipmentId?: string;
        requireDeposit?: boolean;
        depositAmount?: number;
    }): Promise<{
        appointment: {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            patientId: string;
            notes: string | null;
            duration: number | null;
            partnerId: string | null;
            isOnline: boolean;
            dateTime: Date | null;
            meetingLink: string | null;
            roomId: string | null;
            equipmentId: string | null;
            professionalId: string | null;
        };
        pixDeposit: any;
    }>;
    /**
     * Reagendamento inteligente (Prepara terreno para IA)
     */
    reschedule(appointmentId: string, newDateTime: Date): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        notes: string | null;
        duration: number | null;
        partnerId: string | null;
        isOnline: boolean;
        dateTime: Date | null;
        meetingLink: string | null;
        roomId: string | null;
        equipmentId: string | null;
        professionalId: string | null;
    }>;
}
export declare const appointmentService: AppointmentService;
//# sourceMappingURL=appointment.service.d.ts.map