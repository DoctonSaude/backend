import cron from 'node-cron';
import { PharmacyFinanceService } from '../services/pharmacy-finance.service.js';
import { financeService } from '../services/finance.service.js';
import { logger } from '../lib/logger.js';

export class FinanceJob {
  public static start() {
    // Roda todos os dias às 00:00
    cron.schedule('0 0 * * *', async () => {
      logger.info('[FinanceJob] Iniciando rotina de liquidação (D+30)...');
      try {
        await this.processPendingTransactions();
        logger.info('[FinanceJob] Rotina concluída com sucesso.');
      } catch (error) {
        logger.error('[FinanceJob] Erro ao processar liquidações:', error);
      }
    });
  }

  public static async processPendingTransactions() {
    // 1. Repasses de Farmácia
    logger.info('[FinanceJob] Processando pedidos de farmácia pendentes de repasse...');
    const pharmacyCount = await PharmacyFinanceService.processSettlements();
    logger.info(`[FinanceJob] Liquidação de farmácia: ${pharmacyCount} transações.`);

    // 2. Repasses de Serviços (Agendamentos)
    logger.info('[FinanceJob] Processando repasses de serviços pendentes (D+30)...');
    const serviceCount = await financeService.processLiquidations();
    logger.info(`[FinanceJob] Liquidação de serviços: ${serviceCount} transações.`);

    return { pharmacyCount, serviceCount };
  }
}
