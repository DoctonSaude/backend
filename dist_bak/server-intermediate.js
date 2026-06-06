"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// CORS básico
app.use((0, cors_1.default)({
    origin: [
        'https://app.docton.com.br',
        'https://admin.docton.com.br',
        'https://parceiro.docton.com.br',
        'https://docton.com.br',
        'https://doctonsaude.com.br'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Tenant-Id', 'Cache-Control', 'Pragma'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
// Health check básico
app.get('/api/ping', (req, res) => {
    res.status(200).send('PONG - INTERMEDIATE SERVER');
});
// Teste de imports
app.get('/api/test-imports', async (req, res) => {
    const results = {
        env: false,
        logger: false,
        prisma: false,
        errorHandler: false,
        error: null
    };
    try {
        // Test 1: Environment
        const { env } = await Promise.resolve().then(() => __importStar(require('./config/env.js')));
        results.env = !!env;
        console.log('✅ Env import OK');
    }
    catch (err) {
        results.error = `Env import failed: ${err.message}`;
        console.error('❌ Env import failed:', err);
        return res.json(results);
    }
    try {
        // Test 2: Logger
        const { logger } = await Promise.resolve().then(() => __importStar(require('./lib/logger.js')));
        results.logger = !!logger;
        console.log('✅ Logger import OK');
    }
    catch (err) {
        results.error = `Logger import failed: ${err.message}`;
        console.error('❌ Logger import failed:', err);
        return res.json(results);
    }
    try {
        // Test 3: Prisma
        const prisma = await Promise.resolve().then(() => __importStar(require('./lib/prisma.js')));
        results.prisma = !!prisma;
        console.log('✅ Prisma import OK');
    }
    catch (err) {
        results.error = `Prisma import failed: ${err.message}`;
        console.error('❌ Prisma import failed:', err);
        return res.json(results);
    }
    try {
        // Test 4: Error Handler
        const { errorHandler } = await Promise.resolve().then(() => __importStar(require('./middleware/errorHandler.js')));
        results.errorHandler = !!errorHandler;
        console.log('✅ ErrorHandler import OK');
    }
    catch (err) {
        results.error = `ErrorHandler import failed: ${err.message}`;
        console.error('❌ ErrorHandler import failed:', err);
        return res.json(results);
    }
    results.error = 'All imports successful';
    console.log('🎉 All imports successful!');
    return res.json(results);
});
// Rota de teste
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Intermediate server working!',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
});
const server = app.listen(PORT, () => {
    console.log(`🚀 INTERMEDIATE SERVER running on port ${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/ping`);
    console.log(`🔍 Test imports: http://localhost:${PORT}/api/test-imports`);
});
server.on('error', (err) => {
    console.error('❌ Failed to start intermediate server:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=server-intermediate.js.map