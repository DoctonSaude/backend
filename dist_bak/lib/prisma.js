"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../lib/generated/prisma/index.js");
require("dotenv/config");
const logger_js_1 = require("./logger.js");
const getDatabaseUrl = () => {
    let url = (process.env.DIRECT_URL || process.env.DATABASE_URL);
    if (url) {
        // CRITICAL: Monolith should bypass PgBouncer to avoid distributed deadlocks
        // Replace 6543 (PgBouncer) with 5432 (Session) if DIRECT_URL wasn't provided
        url = url.replace(':6543', ':5432').replace('?pgbouncer=true', '');
        // Remove duplicate params if any
        url = url.replace('&&', '&').replace('?&', '?');
        // Log sem credenciais
        const obfuscatedUrl = url.replace(/:([^@]+)@/, ':****@');
        logger_js_1.logger.info(`Initializating Prisma with DB: ${obfuscatedUrl}`);
        if (!url.includes('connect_timeout')) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}connect_timeout=20&connection_limit=50`;
        }
        else {
            // Garantir que o limite de conexões esteja presente mesmo se o timeout já estiver
            if (!url.includes('connection_limit')) {
                url = `${url}&connection_limit=50`;
            }
        }
    }
    else {
        logger_js_1.logger.warn('DATABASE_URL is not defined in environment!');
    }
    return url;
};
const prisma = new index_js_1.PrismaClient({
    log: ['error', 'warn'],
    datasources: {
        db: { url: getDatabaseUrl() },
    },
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map