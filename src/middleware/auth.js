"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
var jsonwebtoken_1 = require("jsonwebtoken");
var errorHandler_1 = require("./errorHandler");
var env_1 = require("../config/env");
var tokenRevocationStore_1 = require("../lib/tokenRevocationStore");
var logger_1 = require("../lib/logger");
var prisma_1 = require("../lib/prisma");
// Segurança: impedir que o bypass de admin de desenvolvimento esteja ativo em produção.
if (env_1.env.NODE_ENV === 'production' && env_1.env.ADMIN_DEV_BYPASS) {
    logger_1.logger.error('CRITICAL: ADMIN_DEV_BYPASS habilitado em produção — abortando inicialização por segurança');
    throw new Error('Security violation: ADMIN_DEV_BYPASS habilitado em produção');
}
/**
 * Middleware de autenticação JWT
 */
var authenticate = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var devBypassHeader, devBypassUser, userId, token, secretLen, secretPreview, decoded, tokenUserId, revokedAt, tokenIat, user, lookupErr_1, msg, error_1;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 6, , 7]);
                devBypassHeader = String(req.headers['x-dev-admin-bypass'] || '').toLowerCase();
                devBypassUser = String(req.headers['x-dev-bypass-user'] || '').trim();
                if (env_1.env.NODE_ENV !== 'production' && env_1.env.ADMIN_DEV_BYPASS && (devBypassHeader === 'true' || devBypassHeader === '1' || devBypassHeader === 'yes')) {
                    userId = devBypassUser || env_1.env.ADMIN_DEV_USER_ID;
                    req.user = { userId: userId, role: 'ADMIN', email: 'rodrigo.vilela@docton.com' };
                    logger_1.logger.debug('[auth] dev admin bypass via header', { userId: userId, role: 'ADMIN' });
                    res.setHeader('X-Dev-Admin-Bypass', 'true');
                    res.setHeader('X-Dev-Bypass-User', userId);
                    return [2 /*return*/, next()];
                }
                token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
                if (!token) {
                    throw new errorHandler_1.AuthenticationError('Token não fornecido');
                }
                secretLen = env_1.env.JWT_SECRET ? env_1.env.JWT_SECRET.length : 0;
                secretPreview = env_1.env.JWT_SECRET ? env_1.env.JWT_SECRET.slice(0, 3) + '...' : 'not-set';
                decoded = void 0;
                try {
                    decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
                }
                catch (verifError) {
                    logger_1.logger.error('[auth] JWT verification failed', {
                        error: verifError.message,
                        secretLen: secretLen,
                        secretPreview: secretPreview,
                        tokenPrefix: token.slice(0, 10) + '...'
                    });
                    throw verifError;
                }
                tokenUserId = (_b = decoded.userId) !== null && _b !== void 0 ? _b : decoded.id;
                // LOG: diagnosticar problemas de lookup de usuário
                logger_1.logger.debug('[auth] decoded token', { decoded: decoded, tokenUserId: tokenUserId });
                return [4 /*yield*/, (0, tokenRevocationStore_1.getRevokedAt)()];
            case 1:
                revokedAt = _c.sent();
                tokenIat = decoded.iat;
                if (revokedAt && tokenIat && tokenIat < revokedAt) {
                    throw new errorHandler_1.AuthenticationError('Token revogado');
                }
                if (env_1.env.NODE_ENV !== 'production' && env_1.env.ADMIN_DEV_BYPASS && tokenUserId === env_1.env.ADMIN_DEV_USER_ID) {
                    req.user = { userId: env_1.env.ADMIN_DEV_USER_ID, role: 'ADMIN', email: 'rodrigo.vilela@docton.com' };
                    logger_1.logger.debug('[auth] dev admin bypass', { userId: env_1.env.ADMIN_DEV_USER_ID, role: 'ADMIN' });
                    res.setHeader('X-Dev-Admin-Bypass', 'true');
                    res.setHeader('X-Dev-Bypass-User', env_1.env.ADMIN_DEV_USER_ID);
                    return [2 /*return*/, next()];
                }
                _c.label = 2;
            case 2:
                _c.trys.push([2, 4, , 5]);
                if (!tokenUserId) {
                    logger_1.logger.error('[auth] tokenUserId is undefined', { decoded: decoded });
                    throw new errorHandler_1.AuthenticationError('ID de usuário não encontrado no token');
                }
                return [4 /*yield*/, prisma_1.default.user.findUnique({
                        where: { id: tokenUserId },
                        select: {
                            id: true,
                            role: true,
                            email: true,
                            personId: true,
                            tenantId: true
                        }
                    })];
            case 3:
                user = _c.sent();
                if (!user) {
                    logger_1.logger.error("[auth] Usu\u00E1rio ".concat(tokenUserId, " n\u00E3o encontrado no banco de dados."), {
                        role: decoded.role,
                        email: decoded.email
                    });
                    throw new errorHandler_1.AuthenticationError('Usuário não encontrado no banco de dados. Por favor, realize o cadastro novamente.');
                }
                req.user = {
                    userId: user.id,
                    role: user.role,
                    email: user.email,
                    personId: user.personId || undefined,
                    tenantId: user.tenantId || undefined
                };
                logger_1.logger.debug('[auth] user authenticated', { userId: user.id, role: user.role });
                res.setHeader('X-Auth-Status', 'authenticated');
                return [2 /*return*/, next()];
            case 4:
                lookupErr_1 = _c.sent();
                if (lookupErr_1 instanceof errorHandler_1.AuthenticationError)
                    throw lookupErr_1;
                msg = (lookupErr_1 === null || lookupErr_1 === void 0 ? void 0 : lookupErr_1.message) ? String(lookupErr_1.message) : String(lookupErr_1);
                logger_1.logger.error('[auth] Erro crítico no lookup de usuário:', {
                    error: msg,
                    stack: lookupErr_1 === null || lookupErr_1 === void 0 ? void 0 : lookupErr_1.stack,
                    tokenUserId: tokenUserId
                });
                return [2 /*return*/, res.status(500).json({
                        error: 'Erro interno ao validar autenticação',
                        details: env_1.env.NODE_ENV === 'development' ? msg : undefined
                    })];
            case 5: return [3 /*break*/, 7];
            case 6:
                error_1 = _c.sent();
                // CORREÇÃO: Tratamento específico para diferentes tipos de erro com logs para diagnóstico
                if (error_1 instanceof errorHandler_1.AuthenticationError || error_1 instanceof errorHandler_1.NotFoundError) {
                    next(error_1);
                }
                else if (error_1 instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                    // Token inválido (formato incorreto, assinatura inválida, etc.)
                    logger_1.logger.error("[auth] Token inv\u00E1lido detectado: ".concat(error_1.message), { path: req.path });
                    next(new errorHandler_1.AuthenticationError('Token inválido'));
                }
                else if (error_1 instanceof jsonwebtoken_1.default.TokenExpiredError) {
                    // Token expirado
                    logger_1.logger.warn("[auth] Token expirado: ".concat(error_1.message), { expiredAt: error_1.expiredAt, path: req.path });
                    next(new errorHandler_1.AuthenticationError('Token expirado'));
                }
                else if (error_1 instanceof jsonwebtoken_1.default.NotBeforeError) {
                    // Token ainda não válido
                    logger_1.logger.warn('[auth] Token ainda não válido (NotBeforeError)', { path: req.path });
                    next(new errorHandler_1.AuthenticationError('Token ainda não válido'));
                }
                else {
                    // Outros erros inesperados
                    logger_1.logger.error('[auth] Erro inesperado na autenticação:', error_1);
                    next(new errorHandler_1.AuthenticationError('Erro na autenticação'));
                }
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.authenticate = authenticate;
/**
 * Middleware de autorização baseado em roles
 */
var authorize = function () {
    var roles = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        roles[_i] = arguments[_i];
    }
    return function (req, res, next) {
        if (!req.user) {
            return next(new errorHandler_1.AuthenticationError('Não autenticado'));
        }
        // Superuser bypass: ADMIN can access anything
        if (req.user.role === 'ADMIN') {
            return next();
        }
        if (!roles.includes(req.user.role)) {
            console.warn("[auth] Acesso negado para usu\u00E1rio ".concat(req.user.userId, ". Role: ").concat(req.user.role, ". Roles permitidos: ").concat(roles.join(', ')));
            return next(new errorHandler_1.AuthorizationError("Acesso negado. Roles permitidos: ".concat(roles.join(', '))));
        }
        // Check removed: Allow all admins in dev mode
        /*
        if (roles.includes('ADMIN') && env.NODE_ENV !== 'production' && env.ADMIN_DEV_BYPASS) {
          if (req.user.userId !== env.ADMIN_DEV_USER_ID) {
            return next(new AuthorizationError('Acesso de admin restrito ao administrador único em desenvolvimento'));
          }
        }
        */
        next();
    };
};
exports.authorize = authorize;
