export declare class TelemedicineService {
    private client;
    /**
     * Cria uma sala no Daily.co para o agendamento
     */
    createRoom(appointmentId: string): Promise<any>;
    /**
     * Gera um token de acesso para a sala
     */
    generateToken(roomName: string, userId: string, userName: string, isOwner?: boolean): Promise<any>;
    /**
     * Busca uma sessão ativa pelo ID do agendamento
     */
    getSessionByAppointment(appointmentId: string): Promise<any>;
    /**
     * Finaliza a sessão no banco
     */
    endSession(appointmentId: string): Promise<any>;
}
export declare const telemedicineService: TelemedicineService;
export default telemedicineService;
//# sourceMappingURL=telemedicine.service.d.ts.map