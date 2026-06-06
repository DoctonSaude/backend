// Script para debug da API Asaas usando o nosso paymentGateway
import 'dotenv/config';
import { paymentGateway } from '../src/services/payment-gateway.service.js';

console.log('🔍 Debug do Asaas Payment Gateway...');

async function debugAsaas() {
  try {
    console.log('1️⃣ Criando cobrança PIX...');
    const charge = await paymentGateway.createCharge({
      amount: 5.00,
      method: 'PIX',
      description: 'Teste Docton Saúde',
      externalReference: `test_docton_${Date.now()}`,
      customer: {
        name: 'Paciente Teste',
        email: 'paciente.teste@docton.com.br',
        taxId: '12345678909' // CPF válido
      },
      dueDateDays: 1
    });

    console.log('✅ Cobrança criada com sucesso!');
    console.log(JSON.stringify(charge, null, 2));

    console.log('\n2️⃣ Consultando status da cobrança...');
    const status = await paymentGateway.getChargeStatus(charge.gatewayId);
    console.log('✅ Status:', status);

    console.log('\n🎉 Integração funcionando perfeitamente!');
  } catch (error: any) {
    console.error('❌ Erro:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    process.exit(1);
  }
}

debugAsaas();
