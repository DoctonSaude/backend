"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
require("dotenv/config");
const logger_js_1 = require("./logger.js");
const getDatabaseUrl = () => {
    const url = process.env.DATABASE_URL;
    if (url) {
        // Log sem credenciais
        const obfuscatedUrl = url.replace(/:([^@]+)@/, ':****@');
        logger_js_1.logger.info(`Initializating Prisma with DB: ${obfuscatedUrl}`);
        if (!url.includes('connect_timeout')) {
            return url.includes('?') ? `${url}&connect_timeout=10` : `${url}?connect_timeout=10`;
        }
    }
    else {
        logger_js_1.logger.warn('DATABASE_URL is not defined in environment!');
    }
    return url;
};
const prisma = new client_1.PrismaClient({
    log: ['error', 'warn'],
    datasources: {
        db: { url: getDatabaseUrl() },
    },
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map