"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
const env_1 = require("../config/env");
const tokenRevocationStore_1 = require("../lib/tokenRevocationStore");
const logger_1 = require("../lib/logger");
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * Middleware de autenticação JWT
 */
const authenticate = async (req, res, next) => {
    try {
        const devBypassHeader = String(req.headers['x-dev-admin-bypass'] || '').toLowerCase();
        const devBypassUser = String(req.headers['x-dev-bypass-user'] || '').trim();
        if (env_1.env.NODE_ENV !== 'production' && env_1.env.ADMIN_DEV_BYPASS && (devBypassHeader === 'true' || devBypassHeader === '1' || devBypassHeader === 'yes')) {
            const userId = devBypassUser || env_1.env.ADMIN_DEV_USER_ID;
            req.user = { userId, role: 'ADMIN', email: 'rodrigo.vilela@docton.com' };
            logger_1.logger.debug('[auth] dev admin bypass via header', { userId, role: 'ADMIN' });
            res.setHeader('X-Dev-Admin-Bypass', 'true');
            res.setHeader('X-Dev-Bypass-User', userId);
            return next();
        }
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            throw new errorHandler_1.AuthenticationError('Token não fornecido');
        }
        const secretLen = env_1.env.JWT_SECRET ? env_1.env.JWT_SECRET.length : 0;
        const secretPreview = env_1.env.JWT_SECRET ? env_1.env.JWT_SECRET.slice(0, 3) + '...' : 'not-set';
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        }
        catch (verifError) {
            logger_1.logger.error('[auth] JWT verification failed', {
                error: verifError.message,
                secretLen,
                secretPreview,
                tokenPrefix: token.slice(0, 10) + '...'
            });
            throw verifError;
        }
        // Compatibilidade: tokens antigos podem usar `id` em vez de `userId`
        const tokenUserId = decoded.userId ?? decoded.id;
        // LOG: diagnosticar problemas de lookup de usuário
        logger_1.logger.debug('[auth] decoded token', { decoded, tokenUserId });
        // Verifica se tokens foram revogados globalmente (por exemplo após incidente)
        const revokedAt = await (0, tokenRevocationStore_1.getRevokedAt)();
        const tokenIat = decoded.iat;
        if (revokedAt && tokenIat && tokenIat < revokedAt) {
            throw new errorHandler_1.AuthenticationError('Token revogado');
        }
        if (env_1.env.NODE_ENV !== 'production' && env_1.env.ADMIN_DEV_BYPASS && tokenUserId === env_1.env.ADMIN_DEV_USER_ID) {
            req.user = { userId: env_1.env.ADMIN_DEV_USER_ID, role: 'ADMIN', email: 'rodrigo.vilela@docton.com' };
            logger_1.logger.debug('[auth] dev admin bypass', { userId: env_1.env.ADMIN_DEV_USER_ID, role: 'ADMIN' });
            res.setHeader('X-Dev-Admin-Bypass', 'true');
            res.setHeader('X-Dev-Bypass-User', env_1.env.ADMIN_DEV_USER_ID);
            return next();
        }
        try {
            // Busca blindada apenas com campos existentes
            const user = await prisma_1.default.user.findUnique({
                where: { id: tokenUserId },
                select: {
                    id: true,
                    role: true,
                    email: true,
                    personId: true,
                    tenantId: true
                }
            });
            if (!user) {
                logger_1.logger.error(`[auth] Usuário ${tokenUserId} não encontrado no banco de dados.`, {
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
            return next();
        }
        catch (lookupErr) {
            if (lookupErr instanceof errorHandler_1.AuthenticationError)
                throw lookupErr;
            const msg = lookupErr?.message ? String(lookupErr.message) : String(lookupErr);
            const code = lookupErr?.code;
            logger_1.logger.error('[auth] Erro crítico no lookup de usuário:', { error: msg, code });
            return res.status(503).json({
                error: 'Serviço de banco de dados temporariamente indisponível',
                message: 'Não foi possível validar sua sessão com o banco de dados.',
                code
            });
        }
    }
    catch (error) {
        // CORREÇÃO: Tratamento específico para diferentes tipos de erro com logs para diagnóstico
        if (error instanceof errorHandler_1.AuthenticationError || error instanceof errorHandler_1.NotFoundError) {
            next(error);
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            // Token inválido (formato incorreto, assinatura inválida, etc.)
            logger_1.logger.error(`[auth] Token inválido detectado: ${error.message}`, { path: req.path });
            next(new errorHandler_1.AuthenticationError('Token inválido'));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            // Token expirado
            logger_1.logger.warn(`[auth] Token expirado: ${error.message}`, { expiredAt: error.expiredAt, path: req.path });
            next(new errorHandler_1.AuthenticationError('Token expirado'));
        }
        else if (error instanceof jsonwebtoken_1.default.NotBeforeError) {
            // Token ainda não válido
            logger_1.logger.warn('[auth] Token ainda não válido (NotBeforeError)', { path: req.path });
            next(new errorHandler_1.AuthenticationError('Token ainda não válido'));
        }
        else {
            // Outros erros inesperados
            logger_1.logger.error('[auth] Erro inesperado na autenticação:', error);
            next(new errorHandler_1.AuthenticationError('Erro na autenticação'));
        }
    }
};
exports.authenticate = authenticate;
/**
 * Middleware de autorização baseado em roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errorHandler_1.AuthenticationError('Não autenticado'));
        }
        // Superuser bypass: ADMIN can access anything
        if (req.user.role === 'ADMIN') {
            return next();
        }
        if (!roles.includes(req.user.role)) {
            console.warn(`[auth] Acesso negado para usuário ${req.user.userId}. Role: ${req.user.role}. Roles permitidos: ${roles.join(', ')}`);
            return next(new errorHandler_1.AuthorizationError(`Acesso negado. Roles permitidos: ${roles.join(', ')}`));
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
//# sourceMappingURL=auth.js.map