import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError, NotFoundError } from './errorHandler';
import { env } from '../config/env';
import { getRevokedAt } from '../lib/tokenRevocationStore';
import { UserCrud } from '../crud/user.crud';
import { logger } from '../lib/logger';

interface JwtPayload {
  userId: string;
  role: string;
  email?: string;
  personId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        email?: string;
        personId?: string;
        tenantId?: string;
      };
    }
  }
}

/**
 * Middleware de autenticação JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const devBypassHeader = String(req.headers['x-dev-admin-bypass'] || '').toLowerCase();
    const devBypassUser = String(req.headers['x-dev-bypass-user'] || '').trim();
    if (env.NODE_ENV !== 'production' && env.ADMIN_DEV_BYPASS && (devBypassHeader === 'true' || devBypassHeader === '1' || devBypassHeader === 'yes')) {
      const userId = devBypassUser || env.ADMIN_DEV_USER_ID;
      req.user = { userId, role: 'ADMIN', email: 'rodrigo.vilela@docton.com' };
      logger.debug('[auth] dev admin bypass via header', { userId, role: 'ADMIN' });
      res.setHeader('X-Dev-Admin-Bypass', 'true');
      res.setHeader('X-Dev-Bypass-User', userId);
      return next();
    }
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AuthenticationError('Token não fornecido');
    }

    const secretLen = env.JWT_SECRET ? env.JWT_SECRET.length : 0;
    const secretPreview = env.JWT_SECRET ? env.JWT_SECRET.slice(0, 3) + '...' : 'not-set';

    let decoded: any;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (verifError: any) {
      logger.error('[auth] JWT verification failed', {
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
    logger.debug('[auth] decoded token', { decoded, tokenUserId });

    // Verifica se tokens foram revogados globalmente (por exemplo após incidente)
    const revokedAt = await getRevokedAt();
    const tokenIat = (decoded as any).iat as number | undefined;
    if (revokedAt && tokenIat && tokenIat < revokedAt) {
      throw new AuthenticationError('Token revogado');
    }

    if (env.NODE_ENV !== 'production' && env.ADMIN_DEV_BYPASS && tokenUserId === env.ADMIN_DEV_USER_ID) {
      req.user = { userId: env.ADMIN_DEV_USER_ID, role: 'ADMIN', email: 'rodrigo.vilela@docton.com' };
      logger.debug('[auth] dev admin bypass', { userId: env.ADMIN_DEV_USER_ID, role: 'ADMIN' });
      res.setHeader('X-Dev-Admin-Bypass', 'true');
      res.setHeader('X-Dev-Bypass-User', env.ADMIN_DEV_USER_ID);
      return next();
    }

    try {
      const user = await UserCrud.findById(tokenUserId);

      if (!user) {
        logger.error(`[auth] Usuário ${tokenUserId} não encontrado no banco de dados.`, {
          role: decoded.role,
          email: decoded.email
        });
        throw new AuthenticationError('Usuário não encontrado no banco de dados. Por favor, realize o cadastro novamente.');
      }

      req.user = {
        userId: user.id,
        role: user.role,
        email: user.email,
        personId: user.personId || undefined,
        tenantId: user.tenantId || undefined
      };

      logger.debug('[auth] user authenticated', { userId: user.id, role: user.role });
      res.setHeader('X-Auth-Status', 'authenticated');
      return next();
    } catch (lookupErr: any) {
      if (lookupErr instanceof AuthenticationError) throw lookupErr;

      const msg = lookupErr?.message ? String(lookupErr.message) : String(lookupErr);
      const code = lookupErr?.code;

      logger.error('[auth] Erro crítico no lookup de usuário:', { error: msg, code });
      
      return res.status(503).json({ 
        error: 'Serviço de banco de dados temporariamente indisponível',
        message: 'Não foi possível validar sua sessão com o banco de dados.',
        code
      });
    }
  } catch (error: any) {
    // CORREÇÃO: Tratamento específico para diferentes tipos de erro com logs para diagnóstico
    if (error instanceof AuthenticationError || error instanceof NotFoundError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      // Token inválido (formato incorreto, assinatura inválida, etc.)
      logger.error(`[auth] Token inválido detectado: ${error.message}`, { path: req.path });
      next(new AuthenticationError('Token inválido'));
    } else if (error instanceof jwt.TokenExpiredError) {
      // Token expirado
      logger.warn(`[auth] Token expirado: ${error.message}`, { expiredAt: error.expiredAt, path: req.path });
      next(new AuthenticationError('Token expirado'));
    } else if (error instanceof jwt.NotBeforeError) {
      // Token ainda não válido
      logger.warn('[auth] Token ainda não válido (NotBeforeError)', { path: req.path });
      next(new AuthenticationError('Token ainda não válido'));
    } else {
      // Outros erros inesperados
      logger.error('[auth] Erro inesperado na autenticação:', error);
      next(new AuthenticationError('Erro na autenticação'));
    }
  }
};

/**
 * Middleware de autorização baseado em roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Não autenticado'));
    }

    // Superuser bypass: ADMIN can access anything
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      console.warn(`[auth] Acesso negado para usuário ${req.user.userId}. Role: ${req.user.role}. Roles permitidos: ${roles.join(', ')}`);
      return next(new AuthorizationError(`Acesso negado. Roles permitidos: ${roles.join(', ')}`));
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
