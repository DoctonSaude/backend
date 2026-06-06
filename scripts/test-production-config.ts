// Testa a configuração de produção
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.production');
if (!fs.existsSync(envPath)) {
    console.error('Arquivo .env.production não encontrado!');
    process.exit(1);
}

dotenv.config({ path: envPath });

console.log('='.repeat(60));
console.log('🔍 TESTE DE CONFIGURAÇÃO DE PRODUÇÃO');
console.log('='.repeat(60));

const config = {
    provider: process.env.PAYMENT_GATEWAY_PROVIDER,
    apiKeyPrefix: process.env.PAYMENT_GATEWAY_API_KEY?.slice(0, 15) + '...',
    baseUrl: process.env.PAYMENT_GATEWAY_BASE_URL,
    webhookSecret: !!process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET,
    nodeEnv: process.env.NODE_ENV
};

console.log('\n📋 Dados da Config:');
console.table(config);

console.log('\n✅ Verificações:');
const checks = [
    { name: 'Provider é assas', ok: config.provider === 'assas' },
    { name: 'API Key tem prefixo $aact_prod_', ok: process.env.PAYMENT_GATEWAY_API_KEY?.startsWith('$aact_prod_') },
    { name: 'URL é de produção', ok: config.baseUrl === 'https://api.asaas.com/v3' },
    { name: 'Webhook Secret configurado', ok: config.webhookSecret },
    { name: 'NODE_ENV é production', ok: config.nodeEnv === 'production' }
];

checks.forEach(check => {
    console.log(`${check.ok ? '✅' : '❌'} ${check.name}`);
});

console.log('\n' + '='.repeat(60));
