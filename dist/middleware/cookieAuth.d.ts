import { Request, Response, NextFunction } from 'express';
/**
 * Configurações de cookies seguros
 */
export declare const COOKIE_OPTIONS: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict";
    maxAge: number;
    path: string;
};
/**
 * Gera tokens de acesso e refresh
 */
export declare function generateTokens(userId: string, role: string, email?: string): {
    accessToken: string;
    refreshToken: string;
};
/**
 * Define cookies de autenticação seguros
 */
export declare function setAuthCookies(res: Response, userId: string, role: string, email?: string): {
    accessToken: string;
    refreshToken: string;
};
/**
 * Remove cookies de autenticação
 */
export declare function clearAuthCookies(res: Response): void;
/**
 * Middleware de autenticação via cookies
 * Tenta primeiro o accessToken, depois o refreshToken se necessário
 */
export declare const authenticateWithCookies: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware híbrido que aceita tanto cookies quanto headers
 * Para compatibilidade durante migração
 */
export declare const authenticateHybrid: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=cookieAuth.d.ts.map