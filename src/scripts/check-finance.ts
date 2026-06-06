import { financeService } from '../services/finance.service.js';

async function main() {
  console.log('Teste Financeiro Iniciando...');
  try {
    const fees = await financeService.calculateFees(100, 'test-partner');
    console.log('Fees calculadas:', fees);
    if (fees.commissionPercent !== 15) throw new Error('Deveria ser 15%');
    console.log('✅ TESTE SUCESSO');
  } catch (err) {
    console.error('❌ TESTE FALHOU:', err);
    process.exit(1);
  }
}

main();
