"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
var cors_js_1 = require("../config/cors.js");
/**
 * Classe base para erros da aplicação
 */
var AppError = /** @class */ (function (_super) {
    __extends(AppError, _super);
    function AppError(message, statusCode, isOperational) {
        if (statusCode === void 0) { statusCode = 500; }
        if (isOperational === void 0) { isOperational = true; }
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        _this.isOperational = isOperational;
        Error.captureStackTrace(_this, _this.constructor);
        return _this;
    }
    return AppError;
}(Error));
exports.AppError = AppError;
/**
 * Erro de validação (400)
 */
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(message) {
        return _super.call(this, message, 400) || this;
    }
    return ValidationError;
}(AppError));
exports.ValidationError = ValidationError;
/**
 * Erro de autenticação (401)
 */
var AuthenticationError = /** @class */ (function (_super) {
    __extends(AuthenticationError, _super);
    function AuthenticationError(message) {
        if (message === void 0) { message = 'Não autenticado'; }
        return _super.call(this, message, 401) || this;
    }
    return AuthenticationError;
}(AppError));
exports.AuthenticationError = AuthenticationError;
/**
 * Erro de autorização (403)
 */
var AuthorizationError = /** @class */ (function (_super) {
    __extends(AuthorizationError, _super);
    function AuthorizationError(message) {
        if (message === void 0) { message = 'Sem permissão'; }
        return _super.call(this, message, 403) || this;
    }
    return AuthorizationError;
}(AppError));
exports.AuthorizationError = AuthorizationError;
/**
 * Erro de recurso não encontrado (404)
 */
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(message) {
        if (message === void 0) { message = 'Recurso não encontrado'; }
        return _super.call(this, message, 404) || this;
    }
    return NotFoundError;
}(AppError));
exports.NotFoundError = NotFoundError;
/**
 * Erro de conflito (409)
 */
var ConflictError = /** @class */ (function (_super) {
    __extends(ConflictError, _super);
    function ConflictError(message) {
        return _super.call(this, message, 409) || this;
    }
    return ConflictError;
}(AppError));
exports.ConflictError = ConflictError;
var fs = require("fs");
var path = require("path");
/**
 * Logger estruturado para erros
 */
var logError = function (err, req) {
    var _a;
    var timestamp = new Date().toISOString();
    var errorLog = __assign(__assign({ timestamp: timestamp, level: 'ERROR', message: err.message, path: req.path, method: req.method, ip: req.ip, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId }, (err instanceof AppError && { statusCode: err.statusCode })), (process.env.NODE_ENV !== 'production' && {
        stack: err.stack,
        body: req.body,
        query: req.query,
    }));
    // Log to file for debugging
    try {
        var logMessage = "\n[".concat(timestamp, "] ").concat(req.method, " ").concat(req.path, " - ").concat(err.message, "\nStack: ").concat(err.stack, "\n");
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
        console.error("[".concat(timestamp, "] ").concat(err.message));
        console.error("Path: ".concat(req.method, " ").concat(req.path));
        if (req.user) {
            console.error("User: ".concat(req.user.userId, " (").concat(req.user.role, ")"));
        }
        if (err.stack) {
            console.error("Stack:\n".concat(err.stack));
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
var errorHandler = function (err, req, res, next) {
    var _a, _b, _c, _d, _e;
    // Garantir headers de CORS em caso de erro para evitar bloqueio no frontend
    var origin = req.headers.origin;
    var isAllowed = origin && (cors_js_1.allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production');
    if (isAllowed) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Tenant-Id, Cache-Control, Pragma');
    }
    else if (!origin && process.env.NODE_ENV === 'production') {
        // Fallback seguro em produção para o app principal se o header sumir
        res.header('Access-Control-Allow-Origin', 'https://app.docton.com.br');
    }
    // Preflight check
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    var msg = (err === null || err === void 0 ? void 0 : err.message) ? String(err.message) : String(err);
    var code = err === null || err === void 0 ? void 0 : err.code;
    // DETECÇÃO DE ERROS DE BANCO - SOLUÇÃO DEFINITIVA
    var isDbError = msg.toLowerCase().includes('tenant or user not found') ||
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
            code: code,
            path: req.path,
            method: req.method,
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
        });
        // Para endpoints que esperam dados, retornar estrutura mínima
        var isDataEndpoint = req.path.includes('/auth/validate') ||
            req.path.includes('/dashboard') ||
            req.path.includes('/loyalty') ||
            req.path.includes('/gamification') ||
            req.path.includes('/notifications') ||
            req.path.includes('/analytics');
        if (isDataEndpoint) {
            // Retornar estrutura mínima baseada no endpoint
            if (req.path.includes('/auth/validate')) {
                return res.json({
                    user: {
                        id: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId) || 'anonymous',
                        email: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.email) || 'email@example.com',
                        name: ((_d = req.user) === null || _d === void 0 ? void 0 : _d.name) || 'Usuário',
                        role: ((_e = req.user) === null || _e === void 0 ? void 0 : _e.role) || 'PATIENT',
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
                return res.json([]);
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
    if (err instanceof AppError || err.statusCode) {
        var statusCode = err.statusCode || (err instanceof AppError ? err.statusCode : 500);
        return res.status(statusCode).json(__assign({ status: 'error', message: err.message }, (process.env.NODE_ENV !== 'production' && { stack: err.stack })));
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
    console.error("[UNHANDLED ERROR] ".concat(req.method, " ").concat(req.path, ":"), err);
    if (err.stack)
        console.error(err.stack);
    return res.status(500).json({
        error: 'Erro interno do servidor',
        message: String(err.message),
        path: req.path
    });
};
exports.errorHandler = errorHandler;
