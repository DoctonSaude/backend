// @ts-nocheck
import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

/**
 * PharmacyFinanceService
 * Responsável pela lógica de liquidação e gestão financeira das farmácias.
 */
export class PharmacyFinanceService {
  /**
   * processSettlements
   * Busca pedidos concluídos e gera transações de repasse (liquidação).
   */
  static async processSettlements() {
    logger.info('[PharmacyFinance] Iniciando processamento de liquidações...');

    try {
      // 1. Buscar pedidos com status FINISHED (que representam vendas concluídas)
      const pendingOrders = await prisma.pharmacyOrder.findMany({
        where: {
          status: 'FINISHED'
        },
        include: {
          pharmacy: true
        }
      });

      logger.info(`[PharmacyFinance] Encontrados ${pendingOrders.length} pedidos concluídos para análise.`);

      let settledCount = 0;

      for (const order of pendingOrders) {
        // 2. Verificar se este pedido já possui uma transação de liquidação vinculada
        // Usamos o campo metadataJson para buscar o orderId de forma segura
        const existingTx = await (prisma.transaction as any).findFirst({
          where: {
            metadataJson: {
              path: ['orderId'],
              equals: order.id
            }
          }
        });

        if (existingTx) {
          continue; // Já liquidado anteriormente
        }

        // 3. Criar a transação de liquidação
        const netAmount = order.total - order.commissionAmount;

        await (prisma.transaction as any).create({
          data: {
            description: `Liquidação Pedido #${order.id.slice(-6).toUpperCase()}`,
            amount: netAmount,
            type: 'INCOME',
            category: 'LIQUIDACAO_FARMACIA',
            status: 'COMPLETED',
            date: new Date(),
            metadataJson: {
              orderId: order.id,
              pharmacyId: order.pharmacyId,
              type: 'pharmacy_settlement',
              totalBruto: order.total,
              comissao: order.commissionAmount
            }
          }
        });

        settledCount++;
      }

      logger.info(`[PharmacyFinance] Liquidação concluída. ${settledCount} novas transações geradas.`);
      return settledCount;
    } catch (error) {
      logger.error('[PharmacyFinance] Erro ao processar liquidações:', error);
      throw error;
    }
  }

  /**
   * getPharmacyBalance
   * Calcula o saldo atual da farmácia com base nas transações de liquidação.
   */
  static async getPharmacyBalance(pharmacyId: string) {
    const transactions = await (prisma.transaction as any).findMany({
      where: {
        metadataJson: {
          path: ['pharmacyId'],
          equals: pharmacyId
        },
        type: 'INCOME'
      }
    });

    const totalBalance = transactions.reduce((sum: number, tx: any) => sum + tx.amount, 0);
    return totalBalance;
  }
}
