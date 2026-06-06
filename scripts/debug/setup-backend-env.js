#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações do ambiente backend
const envConfig = `# 🚀 DOCTON BACKEND - ENVIRONMENT VARIABLES

# Servidor
NODE_ENV=development
PORT=3001

# CORS
CORS_ORIGIN=http://localhost:3002

# JWT - CRÍTICO: Deve ser forte em produção
JWT_SECRET=docton-backend-super-secret-key-min-32-chars-2024
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/docton_website
DIRECT_URL=postgresql://postgres:password@localhost:5432/docton_website

# Redis (opcional): se definido, será usado para revogação de tokens
REDIS_URL=redis://localhost:6379

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
FROM_EMAIL=contato@docton.com.br
FROM_NAME=Docton Saúde

# Push Notifications
VAPID_PUBLIC_KEY=BLbZqWpKlJzQX9h8n2F4g7T6r5E8y1C3v9B2n7M4k6P1Q8w3E5r7T9y2C4v6B8n0M
VAPID_PRIVATE_KEY=MLpKjHgF3dS6b9N2mQ8w1E5r7T4y9C2v8B3n6M1k4P7Q0w3E6r9T2y5C8b1N4m
VAPID_SUBJECT=mailto:contato@docton.com.br

# Cron Jobs
ENABLE_CRON_JOBS=true

# Logs
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX_REQUESTS=50

# Supabase
SUPABASE_URL=https://docton-saude.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvY3Rvbi1zYXVkZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MTAwMDAwMDB9.placeholder-key-replace-with-real-one
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvY3Rvbi1zYXVkZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkxMDAwMDAwMH0.placeholder-service-key-replace-with-real-one

# Firebase
FIREBASE_PROJECT_ID=docton-saude
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@docton-saude.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Blockchain
BLOCKCHAIN_PRIVATE_KEY=your-blockchain-private-key
BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/v3/your-infura-key

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your-whatsapp-phone-id
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
`;

// Criar arquivo .env
const envPath = path.join(process.cwd(), '.env');

console.log('🔧 Configurando variáveis de ambiente do BACKEND...');

// Escrever no .env
fs.writeFileSync(envPath, envConfig);
console.log('✅ Arquivo backend/.env criado com sucesso!');

console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('1. Substitua as variáveis do Supabase com suas credenciais reais');
console.log('2. Configure o PostgreSQL se ainda não tiver');
console.log('3. Execute: npm run dev (no backend)');
console.log('4. Execute: npm run dev (no frontend)');

console.log('\n⚠️  IMPORTANTE:');
console.log('- Configure SUPABASE_URL e SUPABASE_ANON_KEY');
console.log('- Verifique se o PostgreSQL está rodando na porta 5432');
console.log('- Configure as chaves do Firebase, Stripe e OpenAI');
