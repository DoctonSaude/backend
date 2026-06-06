"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const finance_service_js_1 = require("../services/finance.service.js");
async function main() {
    console.log('Teste Financeiro Iniciando...');
    try {
        const fees = await finance_service_js_1.financeService.calculateFees(100, 'test-partner');
        console.log('Fees calculadas:', fees);
        if (fees.commissionPercent !== 15)
            throw new Error('Deveria ser 15%');
        console.log('✅ TESTE SUCESSO');
    }
    catch (err) {
        console.error('❌ TESTE FALHOU:', err);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=check-finance.js.map