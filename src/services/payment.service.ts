import prisma from '../lib/prisma.js';
import { ledgerService, AccountType } from './ledger.service.js';

export class PaymentService {
    /**
     * Gera um micro-depósito Pix para um agendamento
     */
    async generatePixDeposit(appointmentId: string, amount: number) {
        // Simulação de integração com Gateway de Pagamento (ex: Stripe, Mercado Pago, Efí)
        const txId = `PIX_${Math.random().toString(36).substring(7).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutos para pagar

        const deposit = await prisma.pixDeposit.create({
            data: {
                appointmentId,
                amount,
                status: 'PENDING',
                txId,
                pixQrCode: `MOCKED_QR_CODE_FOR_${txId}`,
                pixCopyPaste: `MOCKED_PIX_COPY_PASTE_${txId}`,
                expiresAt
            }
        });

        return deposit;
    }

    /**
     * Confirma o pagamento de um Pix e atualiza o Ledger + Agendamento
     */
    async confirmPixPayment(txId: string) {
        const deposit = await prisma.pixDeposit.findUnique({
            where: { txId },
            include: {
                appointment: {
                    include: {
                        partner: {
                            include: {
                                person: true
                            }
                        }
                    }
                }
            }
        });

        if (!deposit || deposit.status !== 'PENDING') {
            throw new Error('Depósito inválido ou já processado');
        }

        return await prisma.$transaction(async (tx) => {
            // 1. Atualizar status do depósito
            const updatedDeposit = await tx.pixDeposit.update({
                where: { id: deposit.id },
                data: {
                    status: 'PAID',
                    paidAt: new Date()
                }
            });

            // 2. Atualizar status do agendamento para CONFIRMED
            await tx.appointment.update({
                where: { id: deposit.appointmentId },
                data: { status: 'CONFIRMED' }
            });

            // 3. Registrar no Ledger (Micro-depósito entra no Caixa Docton)
            const platformCashAcc = await ledgerService.getOrCreateAccount('Caixa Geral Docton', AccountType.ASSET);
            const patientAcc = await ledgerService.getOrCreateAccount(`Antecipação Paciente: ${deposit.appointmentId}`, AccountType.LIABILITY, deposit.appointment.patientId);

            await tx.journalEntry.create({
                data: {
                    transactionId: `DEP_${deposit.id}`,
                    description: `Micro-depósito Pix: Agendamento ${deposit.appointmentId}`,
                    amount: deposit.amount,
                    debitAccountId: platformCashAcc.id,
                    creditAccountId: patientAcc.id,
                    metadata: JSON.stringify({ type: 'PIX_MICRO_DEPOSIT', appointmentId: deposit.appointmentId })
                }
            });

            return updatedDeposit;
        });
    }

    /**
     * Cancela depósitos expirados
     */
    async cleanupExpiredDeposits() {
        const now = new Date();
        const expired = await prisma.pixDeposit.findMany({
            where: {
                status: 'PENDING',
                expiresAt: { lt: now }
            }
        });

        for (const dep of expired) {
            await prisma.pixDeposit.update({
                where: { id: dep.id },
                data: { status: 'EXPIRED' }
            });

            // Opcional: Cancelar o agendamento se for obrigatório
            await prisma.appointment.update({
                where: { id: dep.appointmentId },
                data: { status: 'CANCELLED', notes: 'Cancelado por falta de pagamento do micro-depósito.' }
            });
        }

        return expired.length;
    }
}

export const paymentService = new PaymentService();
