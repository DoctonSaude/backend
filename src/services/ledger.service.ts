import prisma from '../lib/prisma.js';

export enum AccountType {
    ASSET = "ASSET",
    LIABILITY = "LIABILITY",
    EQUITY = "EQUITY",
    INCOME = "INCOME",
    EXPENSE = "EXPENSE"
}

export class LedgerService {
    /**
     * Garante que uma conta Ledger exista para uma pessoa ou propósito
     */
    async getOrCreateAccount(name: string, type: AccountType, personId?: string) {
        let account = await prisma.ledgerAccount.findFirst({
            where: {
                name,
                personId: personId || null
            }
        });

        if (!account) {
            account = await prisma.ledgerAccount.create({
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
    async recordEntry(params: {
        transactionId: string,
        description: string,
        amount: number,
        debitAccountId: string,
        creditAccountId: string,
        metadata?
    }) {
        return await prisma.journalEntry.create({
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
    async getAccountBalance(accountId: string) {
        const [debits, credits] = await Promise.all([
            prisma.journalEntry.aggregate({
                where: { debitAccountId: accountId },
                _sum: { amount: true }
            }),
            prisma.journalEntry.aggregate({
                where: { creditAccountId: accountId },
                _sum: { amount: true }
            })
        ]);

        const totalDebits = debits._sum.amount || 0;
        const totalCredits = credits._sum.amount || 0;

        const account = await prisma.ledgerAccount.findUnique({ where: { id: accountId } });
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

export const ledgerService = new LedgerService();
