import axios from 'axios';
import prisma from '../lib/prisma.js';

const DAILY_API_KEY = process.env.DAILY_API_KEY || '5ae8e2a2d9006d68dafdf06818bb4f8f87847ef88227ca1a50ae64aa7420c030';
const DAILY_API_URL = 'https://api.daily.co/v1';

export class TelemedicineService {
    private client = axios.create({
        baseURL: DAILY_API_URL,
        headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    /**
     * Cria uma sala no Daily.co para o agendamento
     */
    async createRoom(appointmentId: string) {
        const roomName = `docton-${appointmentId}`;
        const expiresAt = Math.floor(Date.now() / 1000) + 3600 * 24; // 24h de validade

        try {
            const response = await this.client.post('/rooms', {
                name: roomName,
                privacy: 'private',
                properties: {
                    exp: expiresAt,
                    enable_recording: 'cloud',
                    enable_chat: true,
                },
            });

            const session = await (prisma as any).telemedicineSession.upsert({
                where: { appointmentId },
                update: {
                    roomName: response.data.name,
                    roomUrl: response.data.url,
                    status: 'PLANNED'
                },
                create: {
                    appointmentId,
                    roomName: response.data.name,
                    roomUrl: response.data.url,
                    status: 'PLANNED'
                }
            });

            return session;
        } catch (error: any) {
            if (error.response?.status === 400 && error.response?.data?.info?.includes('already exists')) {
                const getResponse = await this.client.get(`/rooms/${roomName}`);
                return await (prisma as any).telemedicineSession.upsert({
                    where: { appointmentId },
                    update: {},
                    create: {
                        appointmentId,
                        roomName: getResponse.data.name,
                        roomUrl: getResponse.data.url,
                        status: 'PLANNED'
                    }
                });
            }
            console.error('Erro ao criar sala no Daily:', error.response?.data || error);
            throw new Error('Falha ao criar sala de telemedicina');
        }
    }

    /**
     * Gera um token de acesso para a sala
     */
    async generateToken(roomName: string, userId: string, userName: string, isOwner: boolean = false) {
        const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hora

        const response = await this.client.post('/meeting-tokens', {
            properties: {
                room_name: roomName,
                user_id: userId,
                user_name: userName,
                is_owner: isOwner,
                exp: expiresAt,
                enable_recording: isOwner ? 'cloud' : undefined,
            },
        });

        return response.data.token;
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
     * Finaliza a sessão no banco
     */
    async endSession(appointmentId: string) {
        return await (prisma as any).telemedicineSession.update({
            where: { appointmentId },
            data: {
                endTime: new Date(),
                status: 'COMPLETED'
            }
        });
    }
}

export const telemedicineService = new TelemedicineService();
export default telemedicineService;
