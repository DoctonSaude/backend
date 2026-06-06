"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyFinanceService = void 0;
// @ts-nocheck
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const logger_js_1 = require("../lib/logger.js");
/**
 * PharmacyFinanceService
 * Responsável pela lógica de liquidação e gestão financeira das farmácias.
 */
class PharmacyFinanceService {
    /**
     * processSettlements
     * Busca pedidos concluídos e gera transações de repasse (liquidação).
     */
    static async processSettlements() {
        logger_js_1.logger.info('[PharmacyFinance] Iniciando processamento de liquidações...');
        try {
            // 1. Buscar pedidos com status FINISHED (que representam vendas concluídas)
            const pendingOrders = await prisma_js_1.default.pharmacyOrder.findMany({
                where: {
                    status: 'FINISHED'
                },
                include: {
                    pharmacy: true
                }
            });
            logger_js_1.logger.info(`[PharmacyFinance] Encontrados ${pendingOrders.length} pedidos concluídos para análise.`);
            let settledCount = 0;
            for (const order of pendingOrders) {
                // 2. Verificar se este pedido já possui uma transação de liquidação vinculada
                // Usamos o campo metadataJson para buscar o orderId de forma segura
                const existingTx = await prisma_js_1.default.transaction.findFirst({
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
                await prisma_js_1.default.transaction.create({
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
            logger_js_1.logger.info(`[PharmacyFinance] Liquidação concluída. ${settledCount} novas transações geradas.`);
            return settledCount;
        }
        catch (error) {
            logger_js_1.logger.error('[PharmacyFinance] Erro ao processar liquidações:', error);
            throw error;
        }
    }
    /**
     * getPharmacyBalance
     * Calcula o saldo atual da farmácia com base nas transações de liquidação.
     */
    static async getPharmacyBalance(pharmacyId) {
        const transactions = await prisma_js_1.default.transaction.findMany({
            where: {
                metadataJson: {
                    path: ['pharmacyId'],
                    equals: pharmacyId
                },
                type: 'INCOME'
            }
        });
        const totalBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        return totalBalance;
    }
}
exports.PharmacyFinanceService = PharmacyFinanceService;
//# sourceMappingURL=pharmacy-finance.service.js.map