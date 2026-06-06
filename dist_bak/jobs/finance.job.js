"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const pharmacy_finance_service_js_1 = require("../services/pharmacy-finance.service.js");
const finance_service_js_1 = require("../services/finance.service.js");
const logger_js_1 = require("../lib/logger.js");
class FinanceJob {
    static start() {
        // Roda todos os dias às 00:00
        node_cron_1.default.schedule('0 0 * * *', async () => {
            logger_js_1.logger.info('[FinanceJob] Iniciando rotina de liquidação (D+30)...');
            try {
                await this.processPendingTransactions();
                logger_js_1.logger.info('[FinanceJob] Rotina concluída com sucesso.');
            }
            catch (error) {
                logger_js_1.logger.error('[FinanceJob] Erro ao processar liquidações:', error);
            }
        });
    }
    static async processPendingTransactions() {
        // 1. Repasses de Farmácia
        logger_js_1.logger.info('[FinanceJob] Processando pedidos de farmácia pendentes de repasse...');
        const pharmacyCount = await pharmacy_finance_service_js_1.PharmacyFinanceService.processSettlements();
        logger_js_1.logger.info(`[FinanceJob] Liquidação de farmácia: ${pharmacyCount} transações.`);
        // 2. Repasses de Serviços (Agendamentos)
        logger_js_1.logger.info('[FinanceJob] Processando repasses de serviços pendentes (D+30)...');
        const serviceCount = await finance_service_js_1.financeService.processLiquidations();
        logger_js_1.logger.info(`[FinanceJob] Liquidação de serviços: ${serviceCount} transações.`);
        return { pharmacyCount, serviceCount };
    }
}
exports.FinanceJob = FinanceJob;
//# sourceMappingURL=finance.job.js.map