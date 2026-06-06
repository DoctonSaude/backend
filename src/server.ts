console.log('!!! BOOTSTRAP STARTING !!! ', new Date().toISOString());
const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  console.log('REDIS_URL (masked):', redisUrl.replace(/:[^@]+@/, ':****@'));
} else {
  console.warn('Redis não configurado - usando fallback');
}

// Triggering restart after .env change
import 'dotenv/config';

// Fix BigInt serialization for Prisma and JSON.stringify
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import express, { Request, Response, NextFunction } from 'express';
import { Server } from 'http';
console.log('!!! SERVER BOOT V9 - GAMIFICATION STABILIZATION ACTIVE !!!');

export const app = express();

// Trust proxy para Railway/produção (necessário para rate-limit com X-Forwarded-For)
app.set('trust proxy', 1);

// Endpoint de Diagnóstico de Choque (Reality Check)
app.get('/api/nuclear-test-final', (req, res) => {
  res.send('YES-BOSS-ACTIVE');
});

app.get('/api/ping', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: 'v10-crud-ready',
    deployed_at: new Date().toISOString(),
    message: 'Sistema de Blog e CRUDs administrativos ativados com sucesso.'
  });
});

import cors from 'cors';
import { env } from './config/env';
import { isOriginAllowed } from './config/cors.js';

// 1. CORS Middleware (CARREGAR NO TOPO)
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
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
app.use((req, res, next) => {
  if (req.headers.origin) {
    res.setHeader('X-CORS-Diagnostic', 'Checked');
  }
  next();
});

import { createServer } from 'http';
import { SocketService } from './lib/socket.js';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import apiRouter from './routes/index.js';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { logger } from './lib/logger.js';

// --- Connectors & Jobs ---
import { registerPharmacyConnector } from './connectors/pharmacy.connector.js';
import { registerB2BConnector } from './connectors/b2b.connector.js';
import { registerIntelligenceConnector } from './connectors/intelligence.connector.js';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ChurnPreventionJobs } from './jobs/churn-prevention.job.js';
import { NPSAnalysisJobs } from './jobs/nps-analysis.job.js';
import { GrowthEngineJobs } from './jobs/growth-engine.job.js';

// --- Config & Services ---
import i18next, { middleware as i18nMiddleware } from './config/i18n.js';
import { medicationSubscriptionService } from './services/medication-subscription.service.js';
import { startPharmacyQuotesWorker } from './workers/pharmacyQuotes.worker.js';
import { initializeNotifications } from './services/notifications.service.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startAutomatedReportsJob } from './jobs/automated-reports.job.js';
import { startAllCronJobs as startWeeklyJobs } from './jobs/weekly-email.job.js';
import { startHealthJourneyJob } from './jobs/health-journey.job.js';
import { FinanceJob } from './jobs/finance.job.js';
import prisma from './lib/prisma.js';
import { performanceLogger } from './middleware/logger.middleware.js';
import { checkRedisHealth } from './lib/redis.js';

const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 3001;

app.get('/', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'docton-backend',
  });
});

// Ignorar requisições de favicon para não sujar os logs (Topico 2)
app.get('/favicon.ico', (req, res) => res.status(204).end());


// 2. Security & Limiters
app.use(helmet({
  frameguard: false, // Permite iframes para Telemedicina
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://*.daily.co"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.docton.com.br", "https://*.doctonsaude.com.br", "http://localhost:3001", "http://localhost:3006", "https://*.daily.co"],
      frameSrc: ["'self'", "https://*.daily.co"],
    },
  },
}));

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Muitas requisições deste IP, tente novamente em 15 minutos',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: 'Muitas tentativas de login, tente novamente em 15 minutos',
  skipSuccessfulRequests: false,
});

app.use('/api/', limiter);
app.use('/api/auth', authLimiter);

// 2. Body & Cookies
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
// Middleware de captura de erro de JSON malformado
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && (err as unknown as { status: number }).status === 400 && 'body' in err) {
    logger.error('[JSON Parse Error] Payload malformado detectado:', {
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
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(mongoSanitize());
app.use(hpp());

// --- Gateway Integrado (Hybrid Routing) ---
// --- Gateway Integrado (Hybrid Routing) ---
// Redireciona chamadas de busca pública para o serviço Next.js (Porta 3002)
app.use([
  '/api/pharmacy/nearby',
  '/api/pharmacy/search',
  '/api/pharmacy/product-search'
], createProxyMiddleware({
  target: process.env.PHARMACY_SERVICE_URL || 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/api/pharmacy': '/api/pharmacies' // Mapeia para o plural esperado pelo Next.js
  },
  logLevel: 'debug'
}));

// Registro local das rotas de Farmácia (Gestão/Marketing)
// Deve vir DEPOIS do proxy para não capturar as rotas de busca
app.use('/api/pharmacy', pharmacyRoutes);

// 4. i18n Middleware
app.use(i18nMiddleware.handle(i18next));

// 5. Performance Logger
app.use(performanceLogger);

// 6. API Routes
app.use('/api', apiRouter);

// Backward-compat / non-API prefixed aliases
app.use('/permissions', apiRouter);
app.use('/reports', apiRouter);
app.use('/medical', apiRouter);
app.use('/telemedicine', apiRouter);
app.use('/partners', apiRouter);
app.use('/partner', apiRouter);

app.get('/api/health', async (_req, res) => {
  let dbStatus = 'down';
  try {
    // Usamos $queryRaw para SELECT 1 pois $executeRaw causa erro ao retornar resultados
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'up';
  } catch (err: unknown) {
    logger.error('Database health check failed:', err instanceof Error ? err.message : String(err));
    dbStatus = 'down';
  }

  const redisHealth = await checkRedisHealth();

  res.json({
    status: 'ok',
    db: dbStatus,
    redis: redisHealth.status,
    redis_message: redisHealth.message,
    dbUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@') : 'MISSING',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    build_id: "v10-admin-quotes-crud"
  });
});

// --- Diagnóstico Global ---
app.use((req, res, next) => {
  res.setHeader('X-Express-Server', 'v8-final-stabilization');
  next();
});

app.use(errorHandler);

// Handler 404 Personalizado para Diagnóstico Nuclear
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found in Express Backend',
    message: 'Esta rota não existe no servidor Express.',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    backend_version: 'v8-final-stabilization'
  });
});

let server: Server | undefined;

export const startServer = () => {
  console.log('--- Initializing Sockets & Jobs ---');
  SocketService.init(httpServer);
  // FinanceJob.start();

  console.log('--- Registering Connectors ---');
  try {
    registerPharmacyConnector();
    registerB2BConnector();
    registerIntelligenceConnector();
  } catch (err) {
    console.error('CRASH in connectors:', err);
  }
  console.log('--- Connectors Registered ---');

  try {
    GrowthEngineJobs.startAllJobs();
  } catch (err) {
    console.error('❌ Failed to start Growth Engine Jobs:', err);
  }

  try {
    // Temporarily disabled due to Redis version incompatibility
    /*
    if (env.REDIS_URL && process.env.DISABLE_REDIS_WORKERS !== 'true') {
      startPharmacyQuotesWorker();
      console.log('✅ Pharmacy Quotes Worker initialized');
    } else {
      console.log('ℹ️  REDIS_URL not configured or workers disabled; Pharmacy Quotes Worker disabled');
    }
    */
    console.log('ℹ️  REDIS Workers disabled for testing');
  } catch (err) {
    console.error('❌ Failed to initialize Pharmacy Quotes Worker', err);
  }

  server = httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`2026-04-16 ${new Date().toLocaleTimeString()} [info]: 🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PUBLIC_PORT:', process.env.PUBLIC_PORT);

    initializeNotifications(server);

    // CRON JOBS DELEGADOS PARA O N8N (MOTOR DE ORQUESTRAÇÃO)
    // Desativado no backend: o n8n será responsável por processos como 
    // Lembretes D-1, Recuperação de Farmácia e Churn, via consulta no Supabase.
    /*
    if (env.ENABLE_CRON_JOBS) {
      console.log('🔄 Starting Cron Jobs...');
      ChurnPreventionJobs.startAllJobs();
      NPSAnalysisJobs.startAllJobs();
      startAutomatedReportsJob();
      startWeeklyJobs();
      startHealthJourneyJob();
      setInterval(() => medicationSubscriptionService.processDueSubscriptions(), 24 * 60 * 60 * 1000);
      console.log('✅ Cron Jobs initialized');
    }
    */
  });
  server.on('error', (err: Error) => {
    console.error(`❌ Failed to start server on port ${PORT}`);
    console.error(err);
    process.exit(1);
  });
  return server;
};

export const stopServer = async () => {
  if (server) {
    return new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

if (process.env.NODE_ENV !== 'test') {
  console.log('--- Calling startServer() ---');

  /*
  try {
    import('./jobs/performance-snapshots.job.js').then(({ performanceSnapshotJob }) => {
      performanceSnapshotJob.start();
      console.log('[Server] Performance snapshot jobs started successfully');
    }).catch((error) => {
      console.error('[Server] Failed to start performance jobs:', error);
    });
  } catch (error) {
    console.error('[Server] Failed to start performance jobs:', error);
  }

  try {
    import('./jobs/drug-learning.job.js').then(({ drugLearningJob }) => {
      drugLearningJob.start();
      console.log('[Server] Drug learning jobs started successfully');
    }).catch((error) => {
      console.error('[Server] Failed to start drug learning jobs:', error);
    });
  } catch (error) {
    console.error('[Server] Failed to start drug learning jobs:', error);
  }

  try {
    import('./jobs/ocr-maintenance.job.js').then(({ ocrMaintenanceJob }) => {
      ocrMaintenanceJob.start();
      console.log('[Server] OCR maintenance jobs started successfully');
    }).catch((error) => {
      console.error('[Server] Failed to start OCR maintenance jobs:', error);
    });
  } catch (error) {
    console.error('[Server] Failed to start OCR maintenance jobs:', error);
  }
  */

  startServer();
}

export default app;
