// Script para testar a integração com o Assas Payment Gateway

// Carregar variáveis de ambiente
import 'dotenv/config';
import { paymentGateway } from '../src/services/payment-gateway.service.js';

async function testAssasGateway() {
  console.log('🧪 Iniciando teste do Assas Payment Gateway...');
  console.log('🔑 Provider ativo:', process.env.PAYMENT_GATEWAY_PROVIDER);

  try {
    // 1. Testar criação de cobrança PIX
    console.log('\n📝 Testando criação de cobrança PIX...');
    const charge = await paymentGateway.createCharge({
      amount: 5.00, // R$ 5,00 (valor pequeno para teste)
      method: 'PIX',
      description: 'Teste de integração Docton Saúde',
      externalReference: `test_${Date.now()}`,
      customer: {
        name: 'Paciente Teste',
        email: 'paciente.teste@docton.com.br',
        taxId: '00000000000', // CPF válido para testes
        phone: '11999999999'
      },
      dueDateDays: 1
    });

    console.log('✅ Cobrança criada com sucesso!');
    console.log('ID da cobrança:', charge.gatewayId);
    console.log('Status:', charge.status);
    console.log('Valor:', charge.amount);
    console.log('QR Code (base64):', charge.pixQrCode ? `${charge.pixQrCode.slice(0, 50)}...` : 'N/A');
    console.log('Copiar e Colar:', charge.pixCopyPaste);
    console.log('Expira em:', charge.expiresAt);

    // 2. Testar consulta de status
    console.log('\n🔍 Testando consulta de status da cobrança...');
    const status = await paymentGateway.getChargeStatus(charge.gatewayId);
    console.log('✅ Status consultado com sucesso!');
    console.log('Status atual:', status.status);
    console.log('Pago em:', status.paidAt);

    // 3. (Opcional) Testar cancelamento
    // console.log('\n❌ Testando cancelamento da cobrança...');
    // await paymentGateway.cancelCharge(charge.gatewayId);
    // console.log('✅ Cobrança cancelada com sucesso!');

    console.log('\n🎉 Todos os testes passaram! A integração com o Assas está funcionando.');

  } catch (error: any) {
    console.error('\n❌ Erro durante o teste:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados do erro:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Executar o teste
testAssasGateway();
