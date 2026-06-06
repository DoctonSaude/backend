import prisma from '../lib/prisma.js';
import { PharmacyFinanceService } from '../services/pharmacy-finance.service.js';

async function test() {
  console.log('--- TESTE DE LIQUIDAÇÃO FINANCEIRA ---');
  
  try {
    const finishedCount = await prisma.pharmacyOrder.count({
      where: { status: 'FINISHED' }
    });
    console.log(`Pedidos com status FINISHED encontrados no banco: ${finishedCount}`);

    // Executar a liquidação (isso é idempotente graças ao metadataJson)
    console.log('Disparando PharmacyFinanceService.processSettlements()...');
    const settled = await PharmacyFinanceService.processSettlements();
    console.log(`Liquidação finalizada. Novos pedidos liquidados nesta rodada: ${settled}`);

    // Verificar se as transações foram criadas
    const txCount = await (prisma.transaction as any).count({
      where: {
        category: 'LIQUIDACAO_FARMACIA'
      }
    });
    console.log(`Total de transações de liquidação no banco agora: ${txCount}`);

  } catch (err) {
    console.error('Erro durante o teste financeiro:', err);
  } finally {
    await prisma.$disconnect();
    console.log('Conexão com o banco encerrada.');
  }
}

test();
