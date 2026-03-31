#!/usr/bin/env node

/**
 * Script para corrigir o banco de dados no Railway
 * Cria as tabelas necessárias sem depender de RLS
 */

require('dotenv/config');
const { execSync } = require('child_process');

// Forçar uso da pooler URL para tudo
process.env.DATABASE_URL = 'postgresql://postgres:Doctonsaude2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres';
process.env.DIRECT_URL = 'postgresql://postgres:Doctonsaude2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres';

console.log('🔧 Corrigindo banco de dados no Railway...\n');
console.log('📡 Usando DATABASE_URL:', process.env.DATABASE_URL.replace(/:[^@]+@/, ':****@'));

async function fixDatabase() {
  try {
    console.log('📡 Verificando conexão com o banco...');
    
    // Primeiro, gerar o Prisma Client
    console.log('🔨 Gerando Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Fazer push do schema para criar tabelas
    console.log('📊 Criando tabelas no banco...');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    
    console.log('\n✅ Banco de dados corrigido com sucesso!');
    console.log('   - Tabelas criadas/atualizadas');
    console.log('   - Schema sincronizado');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir banco:', error.message);
    
    if (error.stdout) {
      console.error('STDOUT:', error.stdout.toString());
    }
    
    if (error.stderr) {
      console.error('STDERR:', error.stderr.toString());
    }
    
    process.exit(1);
  }
}

fixDatabase();
