import prisma from '../lib/prisma.js';
import { addDays } from 'date-fns';

export class FinanceService {
  /**
   * Calcula as taxas e o valor líquido do parceiro com base no plano.
   * FREE: 15% | PRO: 10% | PREMIUM: 5%
   */
  calculateFees(amount: number, planTier: string = 'FREE') {
    let commissionPercent = 15;
    
    if (planTier === 'PRO') commissionPercent = 10;
    if (planTier === 'PREMIUM') commissionPercent = 5;

    const doctonFee = (amount * commissionPercent) / 100;
    const partnerNetPrice = amount - doctonFee;

    return {
      commissionPercent,
      doctonFee,
      partnerNetPrice
    };
  }

  /**
   * Registra a conclusão de um agendamento e atualiza o financeiro do parceiro.
   * Implementa liquidação D+1 por padrão.
   */
  async processAppointmentCompletion(appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        partner: true,
        patient: { include: { user: true } }
      }
    });

    if (!appointment || !appointment.partner) {
      throw new Error('Agendamento ou Parceiro não encontrado');
    }

    // Se o agendamento não tem preço (ex: consulta gratuita), não gera transação financeira
    // Para simplificar, assumiremos que o preço vem do serviço associado (a implementar se necessário)
    // Usaremos um valor base ou buscaremos do serviço se disponível.
    // TODO: Integrar com preço real do serviço
    const basePrice = 100; // Mock de preço enquanto não temos checkout integrado

    const fees = this.calculateFees(basePrice, appointment.partner.planTier);
    
    // Determinar janela de liquidação com base no plano
    let daysToClear = 30; // FREE recebe em 30 dias
    if (appointment.partner.planTier === 'STARTER' || appointment.partner.planTier === 'BASIC') daysToClear = 15;
    if (appointment.partner.planTier === 'PRO') daysToClear = 7;
    if (appointment.partner.planTier === 'PREMIUM') daysToClear = 1;

    // Data de liquidação customizada
    const availableAt = addDays(new Date(), daysToClear);

    // 1. Atualizar Agendamento
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        doctonFee: fees.doctonFee,
        partnerNetPrice: fees.partnerNetPrice,
        commissionPercent: fees.commissionPercent,
        availableAt,
        payoutStatus: 'PENDING'
      }
    });

    // 2. Criar Transação na Carteira (Crédito Pendente)
    await prisma.partnerTransaction.create({
      data: {
        partnerId: appointment.partnerId!,
        appointmentId: appointment.id,
        type: 'CREDIT',
        amount: fees.partnerNetPrice,
        description: `Atendimento: ${appointment.patient.user?.name || 'Paciente'}`,
        status: 'PENDING',
        availableAt
      }
    });

    // 3. Atualizar Saldo Pendente da Carteira
    await prisma.partnerWallet.upsert({
      where: { partnerId: appointment.partnerId! },
      create: {
        partnerId: appointment.partnerId!,
        pendingBalance: fees.partnerNetPrice,
        balance: 0
      },
      update: {
        pendingBalance: { increment: fees.partnerNetPrice }
      }
    });

    return fees;
  }

  /**
   * Retorna estatísticas financeiras detalhadas para o dashboard do parceiro.
   */
  async getWalletStats(partnerId: string) {
    const wallet = await prisma.partnerWallet.findUnique({
      where: { partnerId }
    });

    const transactions = await prisma.partnerTransaction.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const totalGrossRevenue = await prisma.partnerTransaction.aggregate({
      where: { partnerId, type: 'CREDIT' },
      _sum: { amount: true }
    });

    return {
      balance: wallet?.balance || 0,
      pendingBalance: wallet?.pendingBalance || 0,
      totalRevenue: totalGrossRevenue._sum.amount || 0,
      transactions
    };
  }

  /**
   * Solicita um saque do saldo disponível.
   */
  async requestPayout(partnerId: string, amount: number, bankDetails: any) {
    const wallet = await prisma.partnerWallet.findUnique({
      where: { partnerId }
    });

    if (!wallet || wallet.balance < amount) {
      throw new Error('Saldo insuficiente para o saque solicitado.');
    }

    // 1. Criar pedido de saque
    const request = await prisma.payoutRequest.create({
      data: {
        partnerId,
        amount,
        status: 'PENDING',
        bankDetails
      }
    });

    // 2. Deduzir do saldo disponível (bloquear)
    await prisma.partnerWallet.update({
      where: { partnerId },
      data: {
        balance: { decrement: amount }
      }
    });

    // 3. Criar transação de débito
    await prisma.partnerTransaction.create({
      data: {
        partnerId,
        type: 'DEBIT',
        amount: amount,
        description: 'Solicitação de Saque',
        status: 'COMPLETED'
      }
    });

    return request;
  }
}

export const financeService = new FinanceService();
