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
exports.stopServer = exports.startServer = exports.app = void 0;
console.log('!!! BOOTSTRAP STARTING !!! ', new Date().toISOString());
console.log('REDIS_URL (masked):', process.env.REDIS_URL ? process.env.REDIS_URL.replace(/:[^@]+@/, ':****@') : 'MISSING');
// Triggering restart after .env change
require("dotenv/config");
// Fix BigInt serialization for Prisma and JSON.stringify
BigInt.prototype.toJSON = function () {
    return this.toString();
};
const express_1 = __importDefault(require("express"));
exports.app = (0, express_1.default)();
// Trust proxy para Railway/produção (necessário para rate-limit com X-Forwarded-For)
exports.app.set('trust proxy', 1);
// A saúde mais rápida possível, sem dependências
exports.app.get('/api/ping', (req, res) => res.status(200).send('PONG'));
const cors_1 = __importDefault(require("cors"));
const env_js_1 = require("./config/env.js");
const cors_js_1 = require("./config/cors.js");
// 1. CORS Middleware (CARREGAR NO TOPO)
exports.app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if ((0, cors_js_1.isOriginAllowed)(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Bloqueado: ${origin}`);
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Tenant-Id', 'Cache-Control', 'Pragma'],
    maxAge: 86400
}));
// Middleware de diagnóstico (OPCIONAL)
exports.app.use((req, res, next) => {
    if (req.headers.origin) {
        res.setHeader('X-CORS-Diagnostic', 'Checked');
    }
    next();
});
const http_1 = require("http");
const socket_js_1 = require("./lib/socket.js");
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const index_js_1 = __importDefault(require("./routes/index.js"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const hpp_1 = __importDefault(require("hpp"));
const logger_js_1 = require("./lib/logger.js");
// --- Connectors & Jobs ---
const pharmacy_connector_js_1 = require("./connectors/pharmacy.connector.js");
const b2b_connector_js_1 = require("./connectors/b2b.connector.js");
const intelligence_connector_js_1 = require("./connectors/intelligence.connector.js");
const churn_prevention_job_js_1 = require("./jobs/churn-prevention.job.js");
const nps_analysis_job_js_1 = require("./jobs/nps-analysis.job.js");
// --- Config & Services ---
const i18n_js_1 = __importStar(require("./config/i18n.js"));
const medication_subscription_service_js_1 = require("./services/medication-subscription.service.js");
const pharmacyQuotes_worker_js_1 = require("./workers/pharmacyQuotes.worker.js");
const notifications_service_js_1 = require("./services/notifications.service.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const automated_reports_job_js_1 = require("./jobs/automated-reports.job.js");
const weekly_email_job_js_1 = require("./jobs/weekly-email.job.js");
const health_journey_job_js_1 = require("./jobs/health-journey.job.js");
const finance_job_js_1 = require("./jobs/finance.job.js");
const prisma_js_1 = __importDefault(require("./lib/prisma.js"));
const httpServer = (0, http_1.createServer)(exports.app);
// Inicializa Sockets
socket_js_1.SocketService.init(httpServer);
const PORT = process.env.PORT || 3001;
// Init Jobs (Phase 5 Finance)
finance_job_js_1.FinanceJob.start();
exports.app.get('/', (_req, res) => {
    return res.status(200).json({
        status: 'ok',
        service: 'docton-backend',
    });
});
// 2. Security & Limiters
exports.app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://*.docton.com.br", "https://*.doctonsaude.com.br", "http://localhost:3001"],
        },
    },
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: env_js_1.env.RATE_LIMIT_WINDOW_MS,
    max: env_js_1.env.RATE_LIMIT_MAX_REQUESTS,
    message: 'Muitas requisições deste IP, tente novamente em 15 minutos',
    standardHeaders: true,
    legacyHeaders: false,
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: env_js_1.env.RATE_LIMIT_WINDOW_MS,
    max: env_js_1.env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    message: 'Muitas tentativas de login, tente novamente em 15 minutos',
    skipSuccessfulRequests: false,
});
exports.app.use('/api/', limiter);
exports.app.use('/api/auth', authLimiter);
// 2. Body & Cookies
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.json({ limit: '10mb' }));
// Middleware de captura de erro de JSON malformado
exports.app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
        logger_js_1.logger.error('[JSON Parse Error] Payload malformado detectado:', {
            error: err.message,
            ip: req.ip,
            path: req.path
        });
        return res.status(400).json({
            error: 'Corpo da requisição JSON malformado',
            message: err.message
        });
    }
    next();
});
exports.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
exports.app.use((0, express_mongo_sanitize_1.default)());
exports.app.use((0, hpp_1.default)());
// 4. i18n Middleware
exports.app.use(i18n_js_1.middleware.handle(i18n_js_1.default));
const logger_middleware_js_1 = require("./middleware/logger.middleware.js");
// ... (mais abaixo no arquivo onde os middlewares são registrados)
exports.app.use(logger_middleware_js_1.performanceLogger);
// ...
// 6. API Routes
exports.app.use('/api', index_js_1.default);
// Backward-compat / non-API prefixed aliases
exports.app.use('/permissions', index_js_1.default);
exports.app.use('/reports', index_js_1.default);
exports.app.use('/medical', index_js_1.default);
exports.app.use('/telemedicine', index_js_1.default);
exports.app.get('/api/health', async (_req, res) => {
    let dbStatus = 'down';
    try {
        // Usamos $queryRaw para SELECT 1 pois $executeRaw causa erro ao retornar resultados
        await prisma_js_1.default.$queryRaw `SELECT 1`;
        dbStatus = 'up';
    }
    catch (err) {
        logger_js_1.logger.error('Database health check failed:', err.message);
        dbStatus = 'down';
    }
    res.json({
        status: 'ok',
        db: dbStatus,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});
exports.app.use(errorHandler_js_1.errorHandler);
let server;
const startServer = () => {
    console.log('--- Registering Connectors ---');
    try {
        (0, pharmacy_connector_js_1.registerPharmacyConnector)();
        (0, b2b_connector_js_1.registerB2BConnector)();
        (0, intelligence_connector_js_1.registerIntelligenceConnector)();
    }
    catch (err) {
        console.error('CRASH in connectors:', err);
    }
    console.log('--- Connectors Registered ---');
    try {
        if (env_js_1.env.REDIS_URL) {
            (0, pharmacyQuotes_worker_js_1.startPharmacyQuotesWorker)();
            console.log('✅ Pharmacy Quotes Worker initialized');
        }
        else {
            console.log('ℹ️  REDIS_URL not configured; Pharmacy Quotes Worker disabled');
        }
    }
    catch (err) {
        console.error('❌ Failed to initialize Pharmacy Quotes Worker', err);
    }
    server = httpServer.listen(PORT, () => {
        logger_js_1.logger.info(`🚀 Server running on http://localhost:${PORT}`);
        (0, notifications_service_js_1.initializeNotifications)(server);
        if (env_js_1.env.ENABLE_CRON_JOBS) {
            console.log('🔄 Starting Cron Jobs...');
            churn_prevention_job_js_1.ChurnPreventionJobs.startAllJobs();
            nps_analysis_job_js_1.NPSAnalysisJobs.startAllJobs();
            (0, automated_reports_job_js_1.startAutomatedReportsJob)();
            (0, weekly_email_job_js_1.startAllCronJobs)();
            (0, health_journey_job_js_1.startHealthJourneyJob)();
            setInterval(() => medication_subscription_service_js_1.medicationSubscriptionService.processDueSubscriptions(), 24 * 60 * 60 * 1000);
            console.log('✅ Cron Jobs initialized');
        }
    });
    server.on('error', (err) => {
        console.error(`❌ Failed to start server on port ${PORT}`);
        console.error(err);
        process.exit(1);
    });
    return server;
};
exports.startServer = startServer;
const stopServer = async () => {
    if (server) {
        return new Promise((resolve, reject) => {
            server.close((err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
};
exports.stopServer = stopServer;
if (process.env.NODE_ENV !== 'test') {
    console.log('--- Calling startServer() ---');
    try {
        Promise.resolve().then(() => __importStar(require('./jobs/performance-snapshots.job.js'))).then(({ performanceSnapshotJob }) => {
            performanceSnapshotJob.start();
            console.log('[Server] Performance snapshot jobs started successfully');
        }).catch((error) => {
            console.error('[Server] Failed to start performance jobs:', error);
        });
    }
    catch (error) {
        console.error('[Server] Failed to start performance jobs:', error);
    }
    try {
        Promise.resolve().then(() => __importStar(require('./jobs/drug-learning.job.js'))).then(({ drugLearningJob }) => {
            drugLearningJob.start();
            console.log('[Server] Drug learning jobs started successfully');
        }).catch((error) => {
            console.error('[Server] Failed to start drug learning jobs:', error);
        });
    }
    catch (error) {
        console.error('[Server] Failed to start drug learning jobs:', error);
    }
    try {
        Promise.resolve().then(() => __importStar(require('./jobs/ocr-maintenance.job.js'))).then(({ ocrMaintenanceJob }) => {
            ocrMaintenanceJob.start();
            console.log('[Server] OCR maintenance jobs started successfully');
        }).catch((error) => {
            console.error('[Server] Failed to start OCR maintenance jobs:', error);
        });
    }
    catch (error) {
        console.error('[Server] Failed to start OCR maintenance jobs:', error);
    }
    (0, exports.startServer)();
}
exports.default = exports.app;
//# sourceMappingURL=server.js.map