"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerService = exports.LedgerService = exports.AccountType = void 0;
// @ts-nocheck
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
var AccountType;
(function (AccountType) {
    AccountType["ASSET"] = "ASSET";
    AccountType["LIABILITY"] = "LIABILITY";
    AccountType["EQUITY"] = "EQUITY";
    AccountType["INCOME"] = "INCOME";
    AccountType["EXPENSE"] = "EXPENSE";
})(AccountType || (exports.AccountType = AccountType = {}));
class LedgerService {
    /**
     * Garante que uma conta Ledger exista para uma pessoa ou propósito
     */
    async getOrCreateAccount(name, type, personId) {
        let account = await prisma_js_1.default.ledgerAccount.findFirst({
            where: {
                name,
                personId: personId || null
            }
        });
        if (!account) {
            account = await prisma_js_1.default.ledgerAccount.create({
                data: {
                    name,
                    type,
                    personId,
                    currency: 'BRL',
                    isActive: true
                }
            });
        }
        return account;
    }
    /**
     * Registra uma entrada no diário (Double-entry)
     * Dr (Débito) na conta receptora
     * Cr (Crédito) na conta de origem
     */
    async recordEntry(params) {
        return await prisma_js_1.default.journalEntry.create({
            data: {
                transactionId: params.transactionId,
                description: params.description,
                amount: params.amount,
                debitAccountId: params.debitAccountId,
                creditAccountId: params.creditAccountId,
                metadata: params.metadata ? JSON.stringify(params.metadata) : null
            }
        });
    }
    /**
     * Busca o saldo de uma conta (Créditos - Débitos)
     * Nota: Para contas de Passivo/Receita, Crédito aumenta o saldo.
     * Para contas de Ativo/Despesa, Débito aumenta o saldo.
     */
    async getAccountBalance(accountId) {
        const [debits, credits] = await Promise.all([
            prisma_js_1.default.journalEntry.aggregate({
                where: { debitAccountId: accountId },
                _sum: { amount: true }
            }),
            prisma_js_1.default.journalEntry.aggregate({
                where: { creditAccountId: accountId },
                _sum: { amount: true }
            })
        ]);
        const totalDebits = debits._sum.amount || 0;
        const totalCredits = credits._sum.amount || 0;
        const account = await prisma_js_1.default.ledgerAccount.findUnique({ where: { id: accountId } });
        if (!account)
            throw new Error('Conta não encontrada');
        // Lógica contábil:
        // Ativos e Despesas: Saldo = Débitos - Créditos
        // Passivos, Patrimônio e Receitas: Saldo = Créditos - Débitos
        if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
            return totalDebits - totalCredits;
        }
        else {
            return totalCredits - totalDebits;
        }
    }
}
exports.LedgerService = LedgerService;
exports.ledgerService = new LedgerService();
//# sourceMappingURL=ledger.service.js.map