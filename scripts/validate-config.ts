// Valida configurações do Asaas
import 'dotenv/config';
import axios from 'axios';

const API_KEY = process.env.PAYMENT_GATEWAY_API_KEY || '';
const BASE_URL = process.env.PAYMENT_GATEWAY_BASE_URL || 'https://api.asaas.com/v3';
const PROVIDER = process.env.PAYMENT_GATEWAY_PROVIDER || '';

console.log('🔍 Validador de Configurações Asaas');
console.log('='.repeat(50));

async function validateConfig() {
  try {
    console.log(`\n1. Provider: ${PROVIDER}`);
    console.log(`2. API Key: ${API_KEY.slice(0, 15)}...`);
    console.log(`3. URL Base: ${BASE_URL}`);

    if (PROVIDER !== 'assas') {
      console.error('\n❌ Erro: PROVIDER não é "assas"!');
      process.exit(1);
    }

    if (!API_KEY) {
      console.error('\n❌ Erro: PAYMENT_GATEWAY_API_KEY não está definida!');
      process.exit(1);
    }

    // Testar conexão com a API do Asaas
    console.log('\n4. Testando conexão com a API do Asaas...');
    const response = await axios.get(`${BASE_URL}/customers`, {
      headers: { 'access_token': API_KEY }
    });

    if (response.status === 200 || response.status === 404) {
      console.log('✅ Conexão com API do Asaas bem-sucedida!');
    }

    console.log('\n🎉 Todas as configurações parecem estar ok!');
  } catch (error: any) {
    console.error('\n❌ Erro na validação:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Dados:`, error.response.data);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

validateConfig();
