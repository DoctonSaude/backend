import cron from 'node-cron';

export class FinanceJob {
  public static start() {
    // Roda todos os dias às 00:00
    cron.schedule('0 0 * * *', async () => {
      console.log('[FinanceJob] Iniciando rotina de liquidação (D+x)...');
      try {
        await this.processPendingTransactions();
        console.log('[FinanceJob] Rotina concluída com sucesso.');
      } catch (error) {
        console.error('[FinanceJob] Erro ao processar liquidações:', error);
      }
    });
  }

  public static async processPendingTransactions() {
    // Lógica desativada: Modelos PartnerTransaction e PartnerWallet inexistentes no schema
    console.log('[FinanceJob] Rotina de liquidação suspensa por incompatibilidade com o schema.');
    return;
  }
}
