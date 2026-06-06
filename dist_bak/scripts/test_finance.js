"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const pharmacy_finance_service_js_1 = require("../services/pharmacy-finance.service.js");
async function test() {
    console.log('--- TESTE DE LIQUIDAÇÃO FINANCEIRA ---');
    try {
        const finishedCount = await prisma_js_1.default.pharmacyOrder.count({
            where: { status: 'FINISHED' }
        });
        console.log(`Pedidos com status FINISHED encontrados no banco: ${finishedCount}`);
        // Executar a liquidação (isso é idempotente graças ao metadataJson)
        console.log('Disparando PharmacyFinanceService.processSettlements()...');
        const settled = await pharmacy_finance_service_js_1.PharmacyFinanceService.processSettlements();
        console.log(`Liquidação finalizada. Novos pedidos liquidados nesta rodada: ${settled}`);
        // Verificar se as transações foram criadas
        const txCount = await prisma_js_1.default.transaction.count({
            where: {
                category: 'LIQUIDACAO_FARMACIA'
            }
        });
        console.log(`Total de transações de liquidação no banco agora: ${txCount}`);
    }
    catch (err) {
        console.error('Erro durante o teste financeiro:', err);
    }
    finally {
        await prisma_js_1.default.$disconnect();
        console.log('Conexão com o banco encerrada.');
    }
}
test();
//# sourceMappingURL=test_finance.js.map