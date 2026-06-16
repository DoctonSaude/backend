import prisma from '../lib/prisma.js';
import { ledgerService, AccountType } from './ledger.service.js';
import { paymentGateway, CreateChargeParams } from './payment-gateway.service.js';

export class PaymentService {
    /**
     * Gera um micro-depósito Pix para um agendamento usando o Gateway configurado (Assas/Mock)
     */
    async generatePixDeposit(appointmentId: string, amount: number, customerData?: {
        name: string;
        email: string;
        taxId?: string;
        phone?: string;
    }) {
        // 1. Criar cobrança via Gateway
        const chargeParams: CreateChargeParams = {
            amount,
            method: 'PIX',
            description: `Micro-depósito para agendamento ${appointmentId}`,
            externalReference: `appointment_${appointmentId}`,
            customer: customerData || {
                name: 'Paciente Teste',
                email: 'paciente@teste.com',
                taxId: '00000000000'
            },
            dueDateDays: 1
        };

        const charge = await paymentGateway.createCharge(chargeParams);

        // 2. Salvar no banco de dados
        const deposit = await prisma.pixDeposit.create({
            data: {
                appointment: { connect: { id: appointmentId } },
                amount,
                status: charge.status as any,
                txId: charge.gatewayId,
                pixQrCode: charge.pixQrCode,
                pixCopyPaste: charge.pixCopyPaste,
                expiresAt: charge.expiresAt
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
                    include: { partner: {
                            include: {
                                Person: true
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
