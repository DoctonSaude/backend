"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemedicineService = exports.TelemedicineService = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const DAILY_API_KEY = process.env.DAILY_API_KEY || '5ae8e2a2d9006d68dafdf06818bb4f8f87847ef88227ca1a50ae64aa7420c030';
const DAILY_API_URL = 'https://api.daily.co/v1';
class TelemedicineService {
    client = axios_1.default.create({
        baseURL: DAILY_API_URL,
        headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });
    /**
     * Cria uma sala no Daily.co para o agendamento
     */
    async createRoom(appointmentId) {
        const roomName = `docton-${appointmentId}`;
        const expiresAt = Math.floor(Date.now() / 1000) + 3600 * 24; // 24h de validade
        try {
            console.log(`[Telemedicine] Creating room for appointment: ${appointmentId}`);
            const response = await this.client.post('/rooms', {
                name: roomName,
                privacy: 'private',
                properties: {
                    exp: expiresAt,
                    enable_recording: 'cloud',
                    enable_chat: true,
                },
            });
            console.log(`[Telemedicine] Room created successfully: ${response.data.url}`);
            const session = await prisma_js_1.default.telemedicineSession.upsert({
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
        }
        catch (error) {
            console.error(`[Telemedicine] Error creating room in Daily:`, error.response?.data || error);
            if (error.response?.status === 400 && error.response?.data?.info?.includes('already exists')) {
                console.log(`[Telemedicine] Room already exists, fetching existing room: ${roomName}`);
                const getResponse = await this.client.get(`/rooms/${roomName}`);
                return await prisma_js_1.default.telemedicineSession.upsert({
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
            throw new Error('Falha ao criar sala de telemedicina');
        }
    }
    /**
     * Gera um token de acesso para a sala
     */
    async generateToken(roomName, userId, userName, isOwner = false) {
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
    async getSessionByAppointment(appointmentId) {
        return await prisma_js_1.default.telemedicineSession.findUnique({
            where: { appointmentId }
        });
    }
    /**
     * Finaliza a sessão no banco
     */
    async endSession(appointmentId) {
        return await prisma_js_1.default.telemedicineSession.update({
            where: { appointmentId },
            data: {
                endTime: new Date(),
                status: 'COMPLETED'
            }
        });
    }
}
exports.TelemedicineService = TelemedicineService;
exports.telemedicineService = new TelemedicineService();
exports.default = exports.telemedicineService;
//# sourceMappingURL=telemedicine.service.js.map