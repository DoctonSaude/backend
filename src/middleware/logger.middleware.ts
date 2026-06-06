import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Capturar o término da request
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { method, originalUrl } = req;
        const { statusCode } = res;

        const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

        // Aumentado o limite pra 2000ms pra evitar alarmes falsos de "Cold Start" (Topico 1)
        if (duration > 2000) {
            logger.warn(`🐌 SLOW REQUEST: ${logMessage}`, {
                method,
                url: originalUrl,
                status: statusCode,
                duration,
                ip: req.ip
            });
        } else if (statusCode >= 400) {
            logger.error(`❌ FAILED REQUEST: ${logMessage}`, {
                method,
                url: originalUrl,
                status: statusCode,
                duration
            });
        } else {
            logger.debug(logMessage);
        }
    });

    next();
};
