"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemedicineService = exports.TelemedicineService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
class TelemedicineService {
    /**
     * Inicia uma sessão de telemedicina para um agendamento
     */
    async createSession(appointmentId, videoRoomId) {
        return await prisma_js_1.default.telemedicineSession.create({
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
    async getSessionByAppointment(appointmentId) {
        return await prisma_js_1.default.telemedicineSession.findUnique({
            where: { appointmentId }
        });
    }
    /**
     * Inicia a chamada (médico ou paciente entrou)
     */
    async startSession(sessionId) {
        return await prisma_js_1.default.telemedicineSession.update({
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
    async endSession(sessionId) {
        return await prisma_js_1.default.telemedicineSession.update({
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
    async generateToken(userId, roomId) {
        // Em produção, aqui integraria com Twilio Video
        return `mock_token_for_${userId}_room_${roomId}`;
    }
}
exports.TelemedicineService = TelemedicineService;
exports.telemedicineService = new TelemedicineService();
//# sourceMappingURL=telemedicine.service.js.map