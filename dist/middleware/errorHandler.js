"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
/**
 * Classe base para erros da aplicação
 */
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Erro de validação (400)
 */
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}
exports.ValidationError = ValidationError;
/**
 * Erro de autenticação (401)
 */
class AuthenticationError extends AppError {
    constructor(message = 'Não autenticado') {
        super(message, 401);
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Erro de autorização (403)
 */
class AuthorizationError extends AppError {
    constructor(message = 'Sem permissão') {
        super(message, 403);
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Erro de recurso não encontrado (404)
 */
class NotFoundError extends AppError {
    constructor(message = 'Recurso não encontrado') {
        super(message, 404);
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Erro de conflito (409)
 */
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
    }
}
exports.ConflictError = ConflictError;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Logger estruturado para erros
 */
const logError = (err, req) => {
    const timestamp = new Date().toISOString();
    const errorLog = {
        timestamp,
        level: 'ERROR',
        message: err.message,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.userId,
        ...(err instanceof AppError && { statusCode: err.statusCode }),
        ...(process.env.NODE_ENV !== 'production' && {
            stack: err.stack,
            body: req.body,
            query: req.query,
        }),
    };
    // Log to file for debugging
    try {
        const logMessage = `\n[${timestamp}] ${req.method} ${req.path} - ${err.message}\nStack: ${err.stack}\n`;
        fs.appendFileSync(path.join(process.cwd(), 'backend_errors.log'), logMessage);
    }
    catch (e) {
        console.error('Failed to write to log file', e);
    }
    if (process.env.NODE_ENV === 'production') {
        // Em produção, log em JSON (ideal para ferramentas como CloudWatch, Sentry)
        console.error(JSON.stringify(errorLog));
    }
    else {
        // Em desenvolvimento, log formatado
        console.error('\n=== ERROR ===');
        console.error(`[${timestamp}] ${err.message}`);
        console.error(`Path: ${req.method} ${req.path}`);
        if (req.user) {
            console.error(`User: ${req.user.userId} (${req.user.role})`);
        }
        if (err.stack) {
            console.error(`Stack:\n${err.stack}`);
        }
        console.error('=============\n');
    }
};
/**
 * Middleware de tratamento de erros
 * @param err - Erro capturado
 * @param req - Request do Express
 * @param res - Response do Express
 * @param next - Função next
 */
const errorHandler = (err, req, res, next) => {
    // Garantir headers de CORS em caso de erro para evitar bloqueio no frontend
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Tenant-Id, Cache-Control, Pragma');
    }
    // Preflight check
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    const msg = err?.message ? String(err.message) : String(err);
    const code = err?.code;
    // DETECÇÃO DE ERROS DE BANCO - SOLUÇÃO DEFINITIVA
    const isDbError = msg.toLowerCase().includes('tenant or user not found') ||
        msg.toLowerCase().includes('error querying the database') ||
        msg.toLowerCase().includes('can\'t reach database server') ||
        msg.toLowerCase().includes('connection') ||
        code === 'P1001' ||
        code === 'P1002' ||
        code === 'P2025' ||
        err.name === 'PrismaClientInitializationError' ||
        err.name === 'PrismaClientKnownRequestError';
    // SE FOR ERRO DE BANCO EM PRODUÇÃO - RESPOSTA AMIGÁVEL QUE NÃO DESLOGA
    if (isDbError && process.env.NODE_ENV === 'production') {
        console.log('[DB ERROR HANDLER] Database error intercepted - returning safe response', {
            error: msg,
            code,
            path: req.path,
            method: req.method,
            userId: req.user?.userId,
        });
        // Para endpoints que esperam dados, retornar estrutura mínima
        const isDataEndpoint = req.path.includes('/auth/validate') ||
            req.path.includes('/dashboard') ||
            req.path.includes('/loyalty') ||
            req.path.includes('/notifications') ||
            req.path.includes('/analytics');
        if (isDataEndpoint) {
            // Retornar estrutura mínima baseada no endpoint
            if (req.path.includes('/auth/validate')) {
                return res.json({
                    user: {
                        id: req.user?.userId || 'anonymous',
                        email: req.user?.email || 'email@example.com',
                        name: req.user?.name || 'Usuário',
                        role: req.user?.role || 'PATIENT',
                        plan: 'basic',
                    },
                    fallback: true,
                    dbError: true
                });
            }
            if (req.path.includes('/dashboard')) {
                return res.json({
                    stats: { totalAppointments: 0, upcomingAppointments: 0, completedAppointments: 0 },
                    upcomingAppointments: [],
                    recentAppointments: [],
                    healthMetrics: null,
                    notifications: [],
                    quickActions: [],
                    fallback: true,
                    dbError: true
                });
            }
            if (req.path.includes('/loyalty')) {
                return res.json({
                    pointsBalance: 0,
                    lifetimePoints: 0,
                    currentTier: { id: 1, name: 'Bronze', minPoints: 0 },
                    nextTier: null,
                    pointsToNextTier: 1500,
                    activeCampaigns: [],
                    activeMultiplier: 1.0,
                    fallback: true,
                    dbError: true
                });
            }
            if (req.path.includes('/notifications')) {
                return res.json({
                    notifications: [],
                    unreadCount: 0,
                    total: 0,
                    fallback: true,
                    dbError: true
                });
            }
            if (req.path.includes('/analytics')) {
                return res.json({
                    success: true,
                    message: 'Event processed (logged only)',
                    fallback: true,
                    dbError: true
                });
            }
        }
        // Para outros endpoints, retornar sucesso genérico APENAS se for GET
        if (req.method === 'GET') {
            return res.json({
                success: true,
                fallback: true,
                dbError: true
            });
        }
        // Para POST, PUT, DELETE, etc., deixar cair no tratamento de erro real
        // Isso garante que o Onboarding NÃO pareça ter funcionado se o banco falhou.
    }
    // Log estruturado do erro
    logError(err, req);
    // Se for um erro operacional conhecido
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        });
    }
    // Erros específicos do Node/Express
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            message: 'Token inválido'
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            message: 'Token expirado'
        });
    }
    if (err.name === 'PrismaClientInitializationError') {
        return res.status(503).json({
            status: 'error',
            message: 'Serviço de banco indisponível',
            code: 'DB_UNAVAILABLE'
        });
    }
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'Erro de validação',
            details: err.message
        });
    }
    // Erro genérico (não operacional)
    console.error(`[UNHANDLED ERROR] ${req.method} ${req.path}:`, err);
    if (err.stack)
        console.error(err.stack);
    return res.status(500).json({
        error: 'Erro interno do servidor',
        message: String(err.message),
        path: req.path
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map