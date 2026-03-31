export declare class TelemedicineService {
    /**
     * Inicia uma sessão de telemedicina para um agendamento
     */
    createSession(appointmentId: string, videoRoomId: string): Promise<any>;
    /**
     * Busca uma sessão ativa pelo ID do agendamento
     */
    getSessionByAppointment(appointmentId: string): Promise<any>;
    /**
     * Inicia a chamada (médico ou paciente entrou)
     */
    startSession(sessionId: string): Promise<any>;
    /**
     * Finaliza a sessão
     */
    endSession(sessionId: string): Promise<any>;
    /**
     * Mock de geração de token de vídeo (Twilio/WebRTC)
     */
    generateToken(userId: string, roomId: string): Promise<string>;
}
export declare const telemedicineService: TelemedicineService;
//# sourceMappingURL=telemedicine.service.d.ts.map