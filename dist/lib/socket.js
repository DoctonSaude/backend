"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const logger_js_1 = require("./logger.js");
const env_js_1 = require("../config/env.js");
const cors_js_1 = require("../config/cors.js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_js_1 = __importDefault(require("./prisma.js"));
class SocketService {
    static io = null;
    static init(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: cors_js_1.allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 60000,
        });
        // Middleware de autenticação JWT
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.query.token;
                if (!token) {
                    logger_js_1.logger.warn('Socket connection attempt without token');
                    return next(new Error('Token não fornecido'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_SECRET);
                const tokenUserId = decoded.userId || decoded.id;
                try {
                    const user = await prisma_js_1.default.user.findUnique({
                        where: { id: tokenUserId },
                        include: { person: true }
                    });
                    if (!user) {
                        return next(new Error('Usuário não encontrado'));
                    }
                    socket.userId = user.id;
                    socket.role = user.role;
                    // Se for farmácia, buscar pharmacyId
                    if (user.role === 'PHARMACY') {
                        const pharmacyUser = await prisma_js_1.default.user.findUnique({
                            where: { id: user.id },
                            select: { pharmacyId: true }
                        });
                        socket.pharmacyId = pharmacyUser?.pharmacyId;
                    }
                    return next();
                }
                catch (dbErr) {
                    const msg = dbErr?.message ? String(dbErr.message) : String(dbErr);
                    const code = dbErr?.code;
                    const dbUnavailable = env_js_1.env.NODE_ENV === 'production' &&
                        (msg.toLowerCase().includes('tenant or user not found') ||
                            msg.toLowerCase().includes('error querying the database') ||
                            code === 'P1001');
                    if (dbUnavailable) {
                        logger_js_1.logger.error('[socket] DB unavailable during socket auth; using JWT-only fallback', {
                            error: msg,
                            code,
                            tokenUserId,
                        });
                        socket.userId = tokenUserId;
                        socket.role = decoded.role || 'PATIENT';
                        return next();
                    }
                    throw dbErr;
                }
            }
            catch (error) {
                logger_js_1.logger.error('Socket authentication error:', error);
                next(new Error('Token inválido'));
            }
        });
        this.io.on('connection', (socket) => {
            const { userId, role, pharmacyId } = socket;
            logger_js_1.logger.info(`User connected: ${userId} (${role}) - Socket: ${socket.id}`);
            // Salas específicas
            socket.join(`user:${userId}`);
            if (role === 'PHARMACY' && pharmacyId) {
                socket.join(`pharmacy:${pharmacyId}`);
                logger_js_1.logger.info(`Pharmacy ${pharmacyId} joined room`);
            }
            if (role === 'PATIENT') {
                socket.join(`patient:${userId}`);
                logger_js_1.logger.info(`Patient ${userId} joined room`);
            }
            // Sala geral de parceiros (legado)
            if (role === 'PHARMACY' || role === 'PARTNER') {
                socket.join('partners');
            }
            socket.on('disconnect', () => {
                logger_js_1.logger.info(`User disconnected: ${userId}`);
            });
            socket.on('error', (error) => {
                logger_js_1.logger.error(`Socket error for user ${userId}:`, error);
            });
        });
        logger_js_1.logger.info('🚀 Socket.io initialized with Auth');
        return this.io;
    }
    static getInstance() {
        if (!this.io) {
            throw new Error('Socket.io not initialized');
        }
        return this.io;
    }
    /**
     * Envia notificação para um usuário específico
     */
    static sendToUser(userId, event, data) {
        if (this.io) {
            this.io.to(`user:${userId}`).emit(event, data);
        }
    }
    /**
     * Envia notificação para todos os parceiros/farmácias
     */
    static sendToPartners(event, data) {
        if (this.io) {
            this.io.to('partners').emit(event, data);
        }
    }
}
exports.SocketService = SocketService;
//# sourceMappingURL=socket.js.map