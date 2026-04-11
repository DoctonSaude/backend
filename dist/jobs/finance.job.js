"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
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
        // Lógica desativada: Modelos PartnerTransaction e PartnerWallet inexistentes no schema
        console.log('[FinanceJob] Rotina de liquidação suspensa por incompatibilidade com o schema.');
        return;
    }
}
exports.FinanceJob = FinanceJob;
//# sourceMappingURL=finance.job.js.map