import { Request, Response, NextFunction } from 'express';
import { allowedOrigins } from '../config/cors.js';

/**
 * Classe base para erros da aplicação
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro de validação (400)
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * Erro de autenticação (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Não autenticado') {
    super(message, 401);
  }
}

/**
 * Erro de autorização (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Sem permissão') {
    super(message, 403);
  }
}

/**
 * Erro de recurso não encontrado (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404);
  }
}

/**
 * Erro de conflito (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

import * as fs from 'fs';
import * as path from 'path';

/**
 * Logger estruturado para erros
 */
const logError = (err: Error | AppError, req: Request) => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    level: 'ERROR',
    message: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.userId,
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
  } catch (e) {
    console.error('Failed to write to log file', e);
  }

  if (process.env.NODE_ENV === 'production') {
    // Em produção, log em JSON (ideal para ferramentas como CloudWatch, Sentry)
    console.error(JSON.stringify(errorLog));
  } else {
    // Em desenvolvimento, log formatado
    console.error('\n=== ERROR ===');
    console.error(`[${timestamp}] ${err.message}`);
    console.error(`Path: ${req.method} ${req.path}`);
    if ((req as any).user) {
      console.error(`User: ${(req as any).user.userId} (${(req as any).user.role})`);
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
export const errorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  // Garantir headers de CORS em caso de erro para evitar bloqueio no frontend
  const origin = req.headers.origin;
  const isAllowed = origin && (allowedOrigins.includes(origin as string) || process.env.NODE_ENV !== 'production');
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin as string);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Tenant-Id, Cache-Control, Pragma');
  } else if (!origin && process.env.NODE_ENV === 'production') {
    // Fallback seguro em produção para o app principal se o header sumir
    res.header('Access-Control-Allow-Origin', 'https://app.docton.com.br');
  }

  // Preflight check
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const msg = err?.message ? String(err.message) : String(err);
  const code = (err as any)?.code;

  // DETECÇÃO DE ERROS DE BANCO - SOLUÇÃO DEFINITIVA
  const isDbError =
    msg.toLowerCase().includes('tenant or user not found') ||
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
      userId: (req as any).user?.userId,
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
            id: (req as any).user?.userId || 'anonymous',
            email: (req as any).user?.email || 'email@example.com',
            name: (req as any).user?.name || 'Usuário',
            role: (req as any).user?.role || 'PATIENT',
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
  if (err.stack) console.error(err.stack);

  return res.status(500).json({
    error: 'Erro interno do servidor',
    message: String(err.message),
    path: req.path
  });
};
