"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceLogger = void 0;
const logger_js_1 = require("../lib/logger.js");
const performanceLogger = (req, res, next) => {
    const start = Date.now();
    // Capturar o término da request
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { method, originalUrl } = req;
        const { statusCode } = res;
        const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;
        if (duration > 500) {
            logger_js_1.logger.warn(`🐌 SLOW REQUEST: ${logMessage}`, {
                method,
                url: originalUrl,
                status: statusCode,
                duration,
                ip: req.ip
            });
        }
        else if (statusCode >= 400) {
            logger_js_1.logger.error(`❌ FAILED REQUEST: ${logMessage}`, {
                method,
                url: originalUrl,
                status: statusCode,
                duration
            });
        }
        else {
            logger_js_1.logger.debug(logMessage);
        }
    });
    next();
};
exports.performanceLogger = performanceLogger;
//# sourceMappingURL=logger.middleware.js.map