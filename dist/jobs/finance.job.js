"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
class FinanceJob {
    static start() {
        // Roda todos os dias às 00:00
        node_cron_1.default.schedule('0 0 * * *', async () => {
            console.log('[FinanceJob] Iniciando rotina de liquidação (D+x)...');
            try {
                await this.processPendingTransactions();
                console.log('[FinanceJob] Rotina concluída com sucesso.');
            }
            catch (error) {
                console.error('[FinanceJob] Erro ao processar liquidações:', error);
            }
        });
    }
    static async processPendingTransactions() {
        const now = new Date();
        // 1. Busca transações que atingiram o D+x
        const pendings = await prisma_js_1.default.partnerTransaction.findMany({
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
                await prisma_js_1.default.$transaction(async (txDb) => {
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
            }
            catch (err) {
                console.error(`[FinanceJob] Erro ao liquidar tx ${tx.id}:`, err);
            }
        }
    }
}
exports.FinanceJob = FinanceJob;
//# sourceMappingURL=finance.job.js.map