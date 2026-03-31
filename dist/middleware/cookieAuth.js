"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateHybrid = exports.authenticateWithCookies = exports.COOKIE_OPTIONS = void 0;
exports.generateTokens = generateTokens;
exports.setAuthCookies = setAuthCookies;
exports.clearAuthCookies = clearAuthCookies;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("./errorHandler");
const env_1 = require("../config/env");
const tokenRevocationStore_1 = require("../lib/tokenRevocationStore");
/**
 * Configurações de cookies seguros
 */
exports.COOKIE_OPTIONS = {
    httpOnly: true, // Previne acesso via JavaScript (XSS)
    secure: env_1.env.NODE_ENV === 'production', // HTTPS apenas em produção
    sameSite: 'strict', // Previne CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    path: '/',
};
/**
 * Gera tokens de acesso e refresh
 */
function generateTokens(userId, role, email) {
    const accessToken = jsonwebtoken_1.default.sign({ userId, role, email, type: 'access' }, env_1.env.JWT_SECRET, { expiresIn: '15m' } // Token de acesso curto
    );
    const refreshToken = jsonwebtoken_1.default.sign({ userId, role, email, type: 'refresh' }, env_1.env.JWT_SECRET, { expiresIn: '7d' } // Refresh token longo
    );
    return { accessToken, refreshToken };
}
/**
 * Define cookies de autenticação seguros
 */
function setAuthCookies(res, userId, role, email) {
    const { accessToken, refreshToken } = generateTokens(userId, role, email);
    // Cookie de acesso (curta duração)
    res.cookie('accessToken', accessToken, {
        ...exports.COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000, // 15 minutos
    });
    // Cookie de refresh (longa duração)
    res.cookie('refreshToken', refreshToken, exports.COOKIE_OPTIONS);
    return { accessToken, refreshToken };
}
/**
 * Remove cookies de autenticação
 */
function clearAuthCookies(res) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
}
/**
 * Middleware de autenticação via cookies
 * Tenta primeiro o accessToken, depois o refreshToken se necessário
 */
const authenticateWithCookies = async (req, res, next) => {
    try {
        let token = req.cookies?.accessToken;
        let isRefreshToken = false;
        // Se não há access token, tenta o refresh token
        if (!token) {
            token = req.cookies?.refreshToken;
            isRefreshToken = true;
        }
        // Fallback para Authorization header (compatibilidade)
        if (!token) {
            token = req.headers.authorization?.replace('Bearer ', '');
        }
        if (!token) {
            throw new errorHandler_1.AuthenticationError('Token não fornecido');
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        // Verifica se tokens foram revogados globalmente (por exemplo após incidente)
        const revokedAt = await (0, tokenRevocationStore_1.getRevokedAt)();
        const tokenIat = decoded.iat;
        if (revokedAt && tokenIat && tokenIat < revokedAt) {
            throw new errorHandler_1.AuthenticationError('Token revogado');
        }
        if (env_1.env.NODE_ENV !== 'production' && env_1.env.ADMIN_DEV_BYPASS && decoded.userId === env_1.env.ADMIN_DEV_USER_ID) {
            req.user = { userId: env_1.env.ADMIN_DEV_USER_ID, role: 'ADMIN', email: 'rodrigo.vilela@docton.com' };
            res.setHeader('X-Dev-Admin-Bypass', 'true');
            res.setHeader('X-Dev-Bypass-User', env_1.env.ADMIN_DEV_USER_ID);
            return next();
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            throw new errorHandler_1.NotFoundError('Usuário não encontrado');
        }
        // Se usou refresh token, gera novos tokens
        if (isRefreshToken && decoded.type === 'refresh') {
            const { accessToken } = setAuthCookies(res, user.id, user.role, user.email);
            // Adiciona o novo token no header para o cliente
            res.setHeader('X-New-Access-Token', accessToken);
        }
        req.user = { userId: user.id, role: user.role, email: user.email };
        next();
    }
    catch (error) {
        // Se token expirou, limpa cookies
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            clearAuthCookies(res);
        }
        next(error);
    }
};
exports.authenticateWithCookies = authenticateWithCookies;
/**
 * Middleware híbrido que aceita tanto cookies quanto headers
 * Para compatibilidade durante migração
 */
const authenticateHybrid = async (req, res, next) => {
    try {
        // Tenta cookies primeiro (mais seguro)
        let token = req.cookies?.accessToken || req.cookies?.refreshToken;
        let isRefreshToken = !!req.cookies?.refreshToken && !req.cookies?.accessToken;
        // Fallback para Authorization header
        if (!token) {
            token = req.headers.authorization?.replace('Bearer ', '');
        }
        if (!token) {
            throw new errorHandler_1.AuthenticationError('Token não fornecido');
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        // Verifica se tokens foram revogados
        const revokedAt = await (0, tokenRevocationStore_1.getRevokedAt)();
        const tokenIat = decoded.iat;
        if (revokedAt && tokenIat && tokenIat < revokedAt) {
            throw new errorHandler_1.AuthenticationError('Token revogado');
        }
        if (env_1.env.NODE_ENV !== 'production' && env_1.env.ADMIN_DEV_BYPASS && decoded.userId === env_1.env.ADMIN_DEV_USER_ID) {
            req.user = { userId: env_1.env.ADMIN_DEV_USER_ID, role: 'ADMIN', email: 'rodrigo.vilela@docton.com' };
            res.setHeader('X-Dev-Admin-Bypass', 'true');
            res.setHeader('X-Dev-Bypass-User', env_1.env.ADMIN_DEV_USER_ID);
            return next();
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            throw new errorHandler_1.NotFoundError('Usuário não encontrado');
        }
        // Se usou refresh token, gera novos tokens
        if (isRefreshToken && decoded.type === 'refresh') {
            setAuthCookies(res, user.id, user.role, user.email);
        }
        req.user = { userId: user.id, role: user.role, email: user.email };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            clearAuthCookies(res);
        }
        next(error);
    }
};
exports.authenticateHybrid = authenticateHybrid;
//# sourceMappingURL=cookieAuth.js.map