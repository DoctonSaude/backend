import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS básico
app.use(cors({
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
    const { env } = await import('./config/env.js');
    results.env = !!env;
    console.log('✅ Env import OK');
  } catch (err: any) {
    results.error = `Env import failed: ${err.message}`;
    console.error('❌ Env import failed:', err);
    return res.json(results);
  }

  try {
    // Test 2: Logger
    const { logger } = await import('./lib/logger.js');
    results.logger = !!logger;
    console.log('✅ Logger import OK');
  } catch (err: any) {
    results.error = `Logger import failed: ${err.message}`;
    console.error('❌ Logger import failed:', err);
    return res.json(results);
  }

  try {
    // Test 3: Prisma
    const prisma = await import('./lib/prisma.js');
    results.prisma = !!prisma;
    console.log('✅ Prisma import OK');
  } catch (err: any) {
    results.error = `Prisma import failed: ${err.message}`;
    console.error('❌ Prisma import failed:', err);
    return res.json(results);
  }

  try {
    // Test 4: Error Handler
    const { errorHandler } = await import('./middleware/errorHandler.js');
    results.errorHandler = !!errorHandler;
    console.log('✅ ErrorHandler import OK');
  } catch (err: any) {
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

server.on('error', (err: any) => {
  console.error('❌ Failed to start intermediate server:', err);
  process.exit(1);
});

export default app;
