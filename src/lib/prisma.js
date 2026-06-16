"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("../../lib/generated/prisma/index.js");
require("dotenv/config");
var logger_js_1 = require("./logger.js");
var getDatabaseUrl = function () {
    var url = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
    if (url) {
        // Mantendo a conexão via pooler (6543) com pgbouncer=true recomendado pelo Supabase/Prisma
        // Remove duplicate params if any
        url = url.replace('&&', '&').replace('?&', '?');
        // Log sem credenciais
        var obfuscatedUrl = url.replace(/:([^@]+)@/, ':****@');
        logger_js_1.logger.info("Initializating Prisma with DB: ".concat(obfuscatedUrl));
        if (!url.includes('connect_timeout')) {
            var separator = url.includes('?') ? '&' : '?';
            url = "".concat(url).concat(separator, "connect_timeout=30&pool_timeout=30&connection_limit=15");
        }
        else {
            // Garantir que os limites de conexões e pool timeout estejam presentes
            url = "".concat(url, "&connection_limit=15");
            if (!url.includes('pool_timeout')) {
                url = "".concat(url, "&pool_timeout=30");
            }
        }
    }
    else {
        logger_js_1.logger.warn('DATABASE_URL is not defined in environment!');
    }
    return url;
};
var prisma = new index_js_1.PrismaClient({
    log: ['error', 'warn'],
    datasources: {
        db: { url: getDatabaseUrl() },
    },
});
exports.default = prisma;
