// Verifica a conexão do Asaas em um backend deployado
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

console.log('='.repeat(60));
console.log('🔍 VERIFICAÇÃO DEPLOY DO ASAAS');
console.log('='.repeat(60));

// Carrega o .env.production (caso esteja testando localmente)
const envPath = path.resolve(process.cwd(), '.env.production');
dotenv.config({ path: envPath });

const config = {
    apiKey: process.env.PAYMENT_GATEWAY_API_KEY,
    baseUrl: process.env.PAYMENT_GATEWAY_BASE_URL,
    provider: process.env.PAYMENT_GATEWAY_PROVIDER,
    webhookSecret: !!process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET
};

console.log('\n📋 Configuração Carregada:');
console.table({
    ...config,
    apiKey: config.apiKey ? config.apiKey.slice(0, 20) + '...' : '(não definida)'
});

console.log('\n✅ Verificações:');

const checks = [
    { ok: config.provider === 'assas', msg: 'Provider é assas' },
    { ok: !!config.apiKey, msg: 'API Key definida' },
    { ok: !!config.baseUrl, msg: 'URL Base definida' },
    { ok: config.baseUrl === 'https://api.asaas.com/v3' || config.baseUrl?.includes('sandbox'), msg: 'URL Base válida' },
    { ok: config.webhookSecret, msg: 'Webhook Secret definido' }
];

checks.forEach(c => {
    console.log(`${c.ok ? '✅' : '❌'} ${c.msg}`);
});

if (!config.apiKey || !config.baseUrl) {
    console.error('\n❌ Erro: Variáveis de ambiente não configuradas corretamente!');
    process.exit(1);
}

console.log('\n🔗 Testando conexão com a API do Asaas...');

try {
    const response = await axios.get(`${config.baseUrl}/customers`, {
        headers: { 'access_token': config.apiKey }
    });

    console.log('✅ Conexão com API do Asaas SUCEDIDA!');
    console.log('   Status:', response.status);

} catch (error: any) {
    console.error('❌ Erro na conexão:');
    if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Dados:', error.response.data);
    } else {
        console.error('   Mensagem:', error.message);
    }
}

console.log('\n' + '='.repeat(60));
