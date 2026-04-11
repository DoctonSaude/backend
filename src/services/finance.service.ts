import prisma from '../lib/prisma.js';
import { addDays } from 'date-fns';

export class FinanceService {
  /**
   * Calcula as taxas e o valor líquido do parceiro.
   * Padrão 15% de taxa de plataforma.
   */
  async calculateFees(amount: number, partnerId: string) {
    let commissionPercent = 15;
    
    // Buscar se há taxa customizada configurada nos dados financeiros
    const financialData = await prisma.partnerFinancialData.findUnique({
      where: { partnerId }
    });

    if (financialData && financialData.platformFeePercentage !== undefined) {
      commissionPercent = financialData.platformFeePercentage;
    }

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
   * Nota: Campos financeiros removidos do modelo Appointment no schema atual.
   * Apenas registramos o fato na tabela Transaction.
   */
  async processAppointmentCompletion(appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        patient: { include: { user: { select: { name: true } } } }
      }
    });

    if (!appointment || !appointment.partnerId) {
      throw new Error('Agendamento ou Parceiro não encontrado');
    }

    // Preço base fixo/calculado (ajuste conforme necessidade do negócio)
    const basePrice = 100;

    const fees = await this.calculateFees(basePrice, appointment.partnerId);
    
    // Janela de liquidação padrão (30 dias)
    const daysToClear = 30;
    const availableAt = addDays(new Date(), daysToClear);

    // 1. Atualizar Status do Agendamento apenas
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'COMPLETED'
      }
    });

    // 2. Criar Transação usando o modelo que existe no schema
    await prisma.transaction.create({
      data: {
        partnerId: appointment.partnerId,
        patientId: appointment.patientId,
        type: 'CREDIT',
        amount: fees.partnerNetPrice,
        description: `Atendimento: ${appointment.patient.user?.name || 'Paciente'}`,
        status: 'PENDING',
        category: 'APPOINTMENT'
      }
    });

    return fees;
  }

  /**
   * Retorna estatísticas financeiras usando o modelo Transaction.
   */
  async getWalletStats(partnerId: string) {
    const transactions = await prisma.transaction.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const totalGrossRevenue = await prisma.transaction.aggregate({
      where: { partnerId, type: 'CREDIT', status: 'COMPLETED' },
      _sum: { amount: true }
    });

    return {
      balance: 0,
      pendingBalance: 0,
      totalRevenue: totalGrossRevenue._sum.amount || 0,
      transactions
    };
  }

  /**
   * Solicita um saque do saldo disponível.
   */
  async requestPayout(partnerId: string, amount: number) {
    const request = await prisma.transaction.create({
      data: {
        partnerId,
        amount,
        type: 'DEBIT',
        description: 'Solicitação de Saque',
        status: 'PENDING',
        category: 'WITHDRAWAL'
      }
    });

    return request;
  }
}

export const financeService = new FinanceService();
