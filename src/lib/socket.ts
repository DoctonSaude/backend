// @ts-nocheck
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from './logger.js';
import { env } from '../config/env.js';
import { allowedOrigins } from '../config/cors.js';
import jwt from 'jsonwebtoken';
import prisma from './prisma.js';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    role?: string;
    pharmacyId?: string;
}

export class SocketService {
    private static io: Server | null = null;

    static init(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
                    import('../config/cors.js').then(({ isOriginAllowed }) => {
                        if (isOriginAllowed(origin)) {
                            callback(null, true);
                        } else {
                            callback(new Error('CORS bloqueado para esta origem'));
                        }
                    });
                },
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 60000,
        });

        // Middleware de autenticação JWT
        this.io.use(async (socket: AuthenticatedSocket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.query.token;
                if (!token) {
                    logger.warn('Socket connection attempt without token');
                    return next(new Error('Token não fornecido'));
                }

                const decoded = jwt.verify(token as string, env.JWT_SECRET!) as any;
                const tokenUserId = decoded.userId || decoded.id;

                try {
                    const user = await prisma.user.findUnique({
                        where: { id: tokenUserId },
                        include: { Person: true }
                    });

                    if (!user) {
                        return next(new Error('Usuário não encontrado'));
                    }

                    socket.userId = user.id;
                    socket.role = user.role;

                    // Se for farmácia, buscar pharmacyId
                    if (user.role === 'PHARMACY') {
                        const pharmacyUser = await prisma.user.findUnique({
                            where: { id: user.id },
                            select: { pharmacyId: true }
                        });
                        socket.pharmacyId = (pharmacyUser as any)?.pharmacyId;
                    }

                    return next();
                } catch (dbErr: any) {
                    const msg = dbErr?.message ? String(dbErr.message) : String(dbErr);
                    const code = dbErr?.code;

                    const dbUnavailable =
                        env.NODE_ENV === 'production' &&
                        (msg.toLowerCase().includes('economicGroup or user not found') ||
                          msg.toLowerCase().includes('error querying the database') ||
                          code === 'P1001');

                    if (dbUnavailable) {
                        logger.error('[socket] DB unavailable during socket auth; using JWT-only fallback', {
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
            } catch (error) {
                logger.error('Socket authentication error:', error);
                next(new Error('Token inválido'));
            }
        });

        this.io.on('connection', (socket: AuthenticatedSocket) => {
            const { userId, role, pharmacyId } = socket;

            logger.info(`User connected: ${userId} (${role}) - Socket: ${socket.id}`);

            // Salas específicas
            socket.join(`user:${userId}`);

            if (role === 'PHARMACY' && pharmacyId) {
                socket.join(`pharmacy:${pharmacyId}`);
                logger.info(`Pharmacy ${pharmacyId} joined room`);
            }

            if (role === 'PATIENT') {
                socket.join(`patient:${userId}`);
                logger.info(`Patient ${userId} joined room`);
            }

            // Sala geral de parceiros (legado)
            if (role === 'PHARMACY' || role === 'PARTNER') {
                socket.join('partners');
            }

            // Sala de administradores
            if (role === 'ADMIN' || role === 'MASTER') {
                socket.join('admins');
                logger.info(`Admin ${userId} joined admins room`);
            }

            socket.on('disconnect', () => {
                logger.info(`User disconnected: ${userId}`);
            });

            socket.on('error', (error) => {
                logger.error(`Socket error for user ${userId}:`, error);
            });
        });

        logger.info('🚀 Socket.io initialized with Auth');
        return this.io;
    }

    static getInstance(): Server {
        if (!this.io) {
            throw new Error('Socket.io not initialized');
        }
        return this.io;
    }

    /**
     * Envia notificação para um usuário específico
     */
    static sendToUser(userId: string, event: string, data: any) {
        if (this.io) {
            this.io.to(`user:${userId}`).emit(event, data);
        }
    }

    /**
     * Envia notificação para todos os administradores
     */
    static sendToAdmins(event: string, data: any) {
        if (this.io) {
            this.io.to('admins').emit(event, data);
        }
    }

    /**
     * Envia notificação para todos os parceiros/farmácias
     */
    static sendToPartners(event: string, data: any) {
        if (this.io) {
            this.io.to('partners').emit(event, data);
        }
    }

    /**
     * Envia evento para a sala da farmácia (usuários com pharmacyId no socket)
     */
    static sendToPharmacy(pharmacyId: string, event: string, data: any) {
        if (this.io) {
            this.io.to(`pharmacy:${pharmacyId}`).emit(event, data);
            this.io.to('partners').emit(event, { ...data, pharmacyId });
        }
    }
}

