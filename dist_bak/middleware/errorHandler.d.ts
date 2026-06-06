import { Request, Response, NextFunction } from 'express';
/**
 * Classe base para erros da aplicação
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
/**
 * Erro de validação (400)
 */
export declare class ValidationError extends AppError {
    constructor(message: string);
}
/**
 * Erro de autenticação (401)
 */
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
/**
 * Erro de autorização (403)
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
/**
 * Erro de recurso não encontrado (404)
 */
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
/**
 * Erro de conflito (409)
 */
export declare class ConflictError extends AppError {
    constructor(message: string);
}
/**
 * Middleware de tratamento de erros
 * @param err - Erro capturado
 * @param req - Request do Express
 * @param res - Response do Express
 * @param next - Função next
 */
export declare const errorHandler: (err: Error | AppError, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=errorHandler.d.ts.map