import prisma from '../lib/prisma.js';

export class TelemedicineService {
    /**
     * Inicia uma sessão de telemedicina para um agendamento
     */
    async createSession(appointmentId: string, videoRoomId: string) {
        return await (prisma as any).telemedicineSession.create({
            data: {
                appointmentId,
                videoRoomId,
                status: 'IDLE'
            }
        });
    }

    /**
     * Busca uma sessão ativa pelo ID do agendamento
     */
    async getSessionByAppointment(appointmentId: string) {
        return await (prisma as any).telemedicineSession.findUnique({
            where: { appointmentId }
        });
    }

    /**
     * Inicia a chamada (médico ou paciente entrou)
     */
    async startSession(sessionId: string) {
        return await (prisma as any).telemedicineSession.update({
            where: { id: sessionId },
            data: {
                startedAt: new Date(),
                status: 'ACTIVE'
            }
        });
    }

    /**
     * Finaliza a sessão
     */
    async endSession(sessionId: string) {
        return await (prisma as any).telemedicineSession.update({
            where: { id: sessionId },
            data: {
                endedAt: new Date(),
                status: 'FINISHED'
            }
        });
    }

    /**
     * Mock de geração de token de vídeo (Twilio/WebRTC)
     */
    async generateToken(userId: string, roomId: string) {
        // Em produção, aqui integraria com Twilio Video
        return `mock_token_for_${userId}_room_${roomId}`;
    }
}

export const telemedicineService = new TelemedicineService();
