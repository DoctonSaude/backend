import cron from 'node-cron';
import prisma from '../lib/prisma.js';

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
    const now = new Date();

    // 1. Busca transações que atingiram o D+x
    const pendings = await prisma.partnerTransaction.findMany({
      where: {
        status: 'PENDING',
        type: 'CREDIT',
        availableAt: {
          lte: now
        }
      }
    });

    if (pendings.length === 0) {
      console.log('[FinanceJob] Nenhuma transação pedente para liquidar hoje.');
      return;
    }

    console.log(`[FinanceJob] Encontradas ${pendings.length} transações para liquidar.`);

    for (const tx of pendings) {
      try {
        await prisma.$transaction(async (txDb) => {
          // Atualiza o status da transação
          await txDb.partnerTransaction.update({
            where: { id: tx.id },
            data: { status: 'AVAILABLE' }
          });

          // Atualiza a carteira do parceiro
          await txDb.partnerWallet.update({
            where: { partnerId: tx.partnerId },
            data: {
              pendingBalance: { decrement: tx.amount },
              balance: { increment: tx.amount }
            }
          });
        });
      } catch (err) {
        console.error(`[FinanceJob] Erro ao liquidar tx ${tx.id}:`, err);
      }
    }
  }
}
