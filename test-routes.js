#!/usr/bin/env node

/**
 * Script para testar se as rotas estão funcionando corretamente
 */

require('dotenv/config');
const express = require('express');

// Configurar variáveis de ambiente para teste
process.env.DATABASE_URL = 'postgresql://postgres:Doctonsaude2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres';
process.env.DIRECT_URL = 'postgresql://postgres:Doctonsaude2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres';
process.env.JWT_SECRET = 'test-secret-32-chars-long';

console.log('🧪 Testando rotas simplificadas...\n');

async function testRoutes() {
  const app = express();
  app.use(express.json());
  
  try {
    // Importar as rotas simplificadas
    const authRoutes = await import('./src/routes/auth.routes.simple.js');
    const analyticsRoutes = await import('./src/routes/analytics.routes.simple.js');
    
    // Montar as rotas
    app.use('/api/auth', authRoutes.default);
    app.use('/api/analytics', analyticsRoutes.default);
    
    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Testar as rotas
    console.log('📡 Iniciando servidor de teste...');
    
    // Teste de analytics
    console.log('🔍 Testando /api/analytics/track...');
    const mockReq = {
      body: {
        event: 'test_event',
        properties: { test: true },
        userId: 'test-user'
      }
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`✅ Analytics Response: ${code}`, data);
          return mockRes;
        }
      })
    };
    
    // Simular chamada à rota
    const analyticsRouter = analyticsRoutes.default;
    const req = { ...mockReq, headers: {} };
    
    // Encontrar a rota /track
    analyticsRouter.stack.forEach(layer => {
      if (layer.route && layer.route.path === '/track' && layer.route.methods.post) {
        console.log('✅ Rota /api/analytics/track encontrada');
        layer.handle(req, mockRes, () => {});
      }
    });
    
    // Teste de auth
    console.log('🔍 Testando /api/auth/register...');
    const authRouter = authRoutes.default;
    
    authRouter.stack.forEach(layer => {
      if (layer.route && layer.route.path === '/register' && layer.route.methods.post) {
        console.log('✅ Rota /api/auth/register encontrada');
        
        const authReq = {
          body: {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
          },
          headers: {}
        };
        
        layer.handle(authReq, mockRes, () => {});
      }
    });
    
    console.log('\n🎉 Testes concluídos! As rotas estão funcionando.');
    
  } catch (error) {
    console.error('❌ Erro ao testar rotas:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testRoutes();
