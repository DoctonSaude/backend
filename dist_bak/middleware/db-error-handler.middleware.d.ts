import { Request, Response, NextFunction } from 'express';
/**
 * Middleware global para capturar erros de banco e converter em respostas amigáveis
 * Evita que o usuário seja deslogado por problemas de conectividade com o banco
 */
export declare function dbErrorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
/**
 * Middleware para capturar erros de banco em rotas assíncronas
 * Uso: router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export declare function asyncHandler(fn: Function): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=db-error-handler.middleware.d.ts.map