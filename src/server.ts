console.log('!!! BOOTSTRAP STARTING !!! ', new Date().toISOString());

// Triggering restart after .env change
import 'dotenv/config';

// Fix BigInt serialization for Prisma and JSON.stringify
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import express from 'express';
export const app = express();

// A saúde mais rápida possível, sem dependências
app.get('/api/ping', (req, res) => res.status(200).send('PONG'));

// Logger e CORS Fail-safe inicial
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`[REQ] ${req.method} ${req.path} | Origin: ${origin}`);

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Tenant-Id');
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

import { createServer } from 'http';
import { SocketService } from './lib/socket.js';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { logger } from './lib/logger.js';

// --- Connectors & Jobs ---
import { registerPharmacyConnector } from './connectors/pharmacy.connector.js';
import { registerB2BConnector } from './connectors/b2b.connector.js';
import { registerIntelligenceConnector } from './connectors/intelligence.connector.js';
import { ChurnPreventionJobs } from './jobs/churn-prevention.job.js';
import { NPSAnalysisJobs } from './jobs/nps-analysis.job.js';

// --- Config & Services ---
import i18next, { middleware as i18nMiddleware } from './config/i18n.js';
import { medicationSubscriptionService } from './services/medication-subscription.service.js';
import { startPharmacyQuotesWorker } from './workers/pharmacyQuotes.worker.js';
import { initializeNotifications } from './services/notifications.service.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startAutomatedReportsJob } from './jobs/automated-reports.job.js';
import { startAllCronJobs as startWeeklyJobs } from './jobs/weekly-email.job.js';
import { startHealthJourneyJob } from './jobs/health-journey.job.js';
import prisma from './lib/prisma.js';


const httpServer = createServer(app);

// Inicializa Sockets
SocketService.init(httpServer);
const PORT = process.env.PORT || 3001;

app.get('/', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'docton-backend',
  });
});

const allowedOrigins = [
  'https://app.docton.com.br',
  'https://doctonsaude.com.br',
  'https://docton.com.br',
  'https://admin.docton.com.br',
  'https://parceiro.docton.com.br',
  'http://localhost:3000',
  'http://localhost:3001',
  ...(env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map(o => o.trim()) : [])
].filter((val): val is string => Boolean(val));

// 1. CORS Configuration
app.use(cors({
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir requisições sem origin (como mobile apps ou curl)
    if (!origin) return callback(null, true);

    // Em desenvolvimento, permitir tudo
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, '');

    // Verificar se o origin termina com .docton.com.br ou .doctonsaude.com.br
    const isDomainMatch = normalizedOrigin.endsWith('.docton.com.br') ||
      normalizedOrigin.endsWith('.doctonsaude.com.br') ||
      normalizedOrigin === 'https://docton.com.br' ||
      normalizedOrigin === 'https://doctonsaude.com.br';

    const isExplicitlyAllowed = allowedOrigins.some(o => {
      const normalizedAllowed = o.replace(/\/$/, '');
      return normalizedOrigin === normalizedAllowed;
    });

    if (isDomainMatch || isExplicitlyAllowed) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Origin blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Tenant-Id'],
  exposedHeaders: ['Set-Cookie'],
  credentials: true,
  maxAge: 86400
}));

// 1.5 Preflight robusto - Resposta estática para CORS
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Tenant-Id');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

// 2. Security & Limiters
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.doctonsaude.com.br", "https://api.docton.com.br", "https://doctonsaude.com.br", "https://docton.com.br", "http://localhost:3001"],
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
app.use(mongoSanitize());
app.use(hpp());

// 3. Body & Cookies
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. i18n Middleware
app.use(i18nMiddleware.handle(i18next));

import { performanceLogger } from './middleware/logger.middleware.js';

// ... (mais abaixo no arquivo onde os middlewares são registrados)
app.use(performanceLogger);
// ...

// 6. API Routes
app.use('/api', apiRouter);

// Backward-compat / non-API prefixed aliases
app.use('/permissions', apiRouter);
app.use('/reports', apiRouter);
app.use('/medical', apiRouter);
app.use('/telemedicine', apiRouter);

app.get('/api/health', async (_req, res) => {
  let dbStatus = 'down';
  try {
    // Usamos $queryRaw para SELECT 1 pois $executeRaw causa erro ao retornar resultados
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'up';
  } catch (err: any) {
    logger.error('Database health check failed:', err.message);
    dbStatus = 'down';
  }
  res.json({
    status: 'ok',
    db: dbStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.use(errorHandler);

let server: any;

export const startServer = () => {
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
    if (env.REDIS_URL) {
      startPharmacyQuotesWorker();
      console.log('✅ Pharmacy Quotes Worker initialized');
    } else {
      console.log('ℹ️  REDIS_URL not configured; Pharmacy Quotes Worker disabled');
    }
  } catch (err) {
    console.error('❌ Failed to initialize Pharmacy Quotes Worker', err);
  }

  server = httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    initializeNotifications(server);
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
  });
  server.on('error', (err: any) => {
    console.error(`❌ Failed to start server on port ${PORT}`);
    console.error(err);
    process.exit(1);
  });
  return server;
};

export const stopServer = async () => {
  if (server) {
    return new Promise<void>((resolve, reject) => {
      server.close((err: any) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

if (process.env.NODE_ENV !== 'test') {
  console.log('--- Calling startServer() ---');

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

  startServer();
}

export default app;
