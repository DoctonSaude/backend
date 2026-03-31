import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AuthenticationError, NotFoundError } from './errorHandler';
import { env } from '../config/env';
import { getRevokedAt } from '../lib/tokenRevocationStore';

interface JwtPayload {
  userId: string;
  role: string;
  email?: string;
  type?: 'access' | 'refresh';
}

/**
 * Configurações de cookies seguros
 */
export const COOKIE_OPTIONS = {
  httpOnly: true, // Previne acesso via JavaScript (XSS)
  secure: env.NODE_ENV === 'production', // HTTPS apenas em produção
  sameSite: 'strict' as const, // Previne CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  path: '/',
};

/**
 * Gera tokens de acesso e refresh
 */
export function generateTokens(userId: string, role: string, email?: string) {
  const accessToken = jwt.sign(
    { userId, role, email, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: '15m' } // Token de acesso curto
  );

  const refreshToken = jwt.sign(
    { userId, role, email, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: '7d' } // Refresh token longo
  );

  return { accessToken, refreshToken };
}

/**
 * Define cookies de autenticação seguros
 */
export function setAuthCookies(res: Response, userId: string, role: string, email?: string) {
  const { accessToken, refreshToken } = generateTokens(userId, role, email);

  // Cookie de acesso (curta duração)
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutos
  });

  // Cookie de refresh (longa duração)
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  return { accessToken, refreshToken };
}

/**
 * Remove cookies de autenticação
 */
export function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
}

/**
 * Middleware de autenticação via cookies
 * Tenta primeiro o accessToken, depois o refreshToken se necessário
 */
export const authenticateWithCookies = async (req: Request, res: Response, next: NextFunction) => {
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
      throw new AuthenticationError('Token não fornecido');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Verifica se tokens foram revogados globalmente (por exemplo após incidente)
    const revokedAt = await getRevokedAt();
    const tokenIat = (decoded as any).iat as number | undefined;
    if (revokedAt && tokenIat && tokenIat < revokedAt) {
      throw new AuthenticationError('Token revogado');
    }

    if (env.NODE_ENV !== 'production' && env.ADMIN_DEV_BYPASS && (decoded as any).userId === env.ADMIN_DEV_USER_ID) {
      req.user = { userId: env.ADMIN_DEV_USER_ID, role: 'ADMIN', email: 'rodrigo.vilela@docton.com' };
      res.setHeader('X-Dev-Admin-Bypass', 'true');
      res.setHeader('X-Dev-Bypass-User', env.ADMIN_DEV_USER_ID);
      return next();
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Se usou refresh token, gera novos tokens
    if (isRefreshToken && decoded.type === 'refresh') {
      const { accessToken } = setAuthCookies(res, user.id, user.role, user.email);

      // Adiciona o novo token no header para o cliente
      res.setHeader('X-New-Access-Token', accessToken);
    }

    req.user = { userId: user.id, role: user.role, email: user.email };
    next();
  } catch (error) {
    // Se token expirou, limpa cookies
    if (error instanceof jwt.TokenExpiredError) {
      clearAuthCookies(res);
    }

    next(error);
  }
};

/**
 * Middleware híbrido que aceita tanto cookies quanto headers
 * Para compatibilidade durante migração
 */
export const authenticateHybrid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Tenta cookies primeiro (mais seguro)
    let token = req.cookies?.accessToken || req.cookies?.refreshToken;
    let isRefreshToken = !!req.cookies?.refreshToken && !req.cookies?.accessToken;

    // Fallback para Authorization header
    if (!token) {
      token = req.headers.authorization?.replace('Bearer ', '');
    }

    if (!token) {
      throw new AuthenticationError('Token não fornecido');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Verifica se tokens foram revogados
    const revokedAt = await getRevokedAt();
    const tokenIat = (decoded as any).iat as number | undefined;
    if (revokedAt && tokenIat && tokenIat < revokedAt) {
      throw new AuthenticationError('Token revogado');
    }

    if (env.NODE_ENV !== 'production' && env.ADMIN_DEV_BYPASS && (decoded as any).userId === env.ADMIN_DEV_USER_ID) {
      req.user = { userId: env.ADMIN_DEV_USER_ID, role: 'ADMIN', email: 'rodrigo.vilela@docton.com' };
      res.setHeader('X-Dev-Admin-Bypass', 'true');
      res.setHeader('X-Dev-Bypass-User', env.ADMIN_DEV_USER_ID);
      return next();
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Se usou refresh token, gera novos tokens
    if (isRefreshToken && decoded.type === 'refresh') {
      setAuthCookies(res, user.id, user.role, user.email);
    }

    req.user = { userId: user.id, role: user.role, email: user.email };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      clearAuthCookies(res);
    }
    next(error);
  }
};
