#!/usr/bin/env node

/**
 * Script para verificar se as tabelas necessárias existem no banco
 */

require('dotenv/config');
const { PrismaClient } = require('./lib/generated/prisma');

console.log('🔍 Verificando tabelas do banco de dados...\n');

async function checkTables() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📡 Conectando ao banco...');
    
    // Lista de tabelas críticas para verificar
    const criticalTables = [
      'User',
      'Patient', 
      'Partner',
      'AnalyticsEvent',
      'Tenant',
      'AuditLog'
    ];
    
    const results = {};
    
    for (const tableName of criticalTables) {
      try {
        // Tentar fazer uma consulta simples para verificar se a tabela existe
        const model = prisma[tableName.toLowerCase()];
        if (model) {
          const count = await model.count();
          results[tableName] = { exists: true, count };
          console.log(`✅ ${tableName}: existe (${count} registros)`);
        } else {
          results[tableName] = { exists: false, error: 'Model not found' };
          console.log(`❌ ${tableName}: modelo não encontrado`);
        }
      } catch (error) {
        results[tableName] = { exists: false, error: error.message };
        console.log(`❌ ${tableName}: erro - ${error.message}`);
      }
    }
    
    // Resumo
    const existingTables = Object.values(results).filter(r => r.exists).length;
    const totalTables = criticalTables.length;
    
    console.log(`\n📊 Resumo: ${existingTables}/${totalTables} tabelas existem`);
    
    if (existingTables < totalTables) {
      console.log('\n⚠️  Algumas tabelas estão faltando!');
      console.log('   Execute: npx prisma db push para criar as tabelas');
    } else {
      console.log('\n🎉 Todas as tabelas críticas existem!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\n🔧 Não foi possível conectar ao banco de dados');
      console.error('   Verifique as variáveis DATABASE_URL e DIRECT_URL');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
