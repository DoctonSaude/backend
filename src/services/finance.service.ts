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
   * Usa o preço real da consulta configurado no perfil do parceiro.
   */
  async processAppointmentCompletion(appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { include: { User: { select: { name: true, id: true } } } },
        Partner: { select: { consultationPrice: true } }
      }
    });

    if (!appointment || !appointment.partnerId) {
      throw new Error('Agendamento ou Parceiro não encontrado');
    }

    // Usar o preço real da consulta configurado no perfil do parceiro
    // Com fallback para R$100 caso não esteja configurado
    const basePrice = appointment.Partner?.consultationPrice
      ? Number(appointment.Partner.consultationPrice)
      : 100;

    const fees = await this.calculateFees(basePrice, appointment.partnerId);
    
    // Criar Transação de CRÉDITO para o parceiro (repasse a receber)
    await prisma.transaction.create({
      data: {
        partnerId: appointment.partnerId,
        patientId: appointment.patientId,
        type: 'CREDIT',
        amount: fees.partnerNetPrice,
        description: `Repasse - Atendimento: ${appointment.Patient?.User?.name || 'Paciente'}`,
        status: 'PENDING',
        category: 'APPOINTMENT',
        metadata: JSON.stringify({
          grossAmount: basePrice,
          platformFee: fees.doctonFee,
          commissionPercent: fees.commissionPercent,
          appointmentId: appointment.id
        })
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

    // Saldo disponível = soma de CREDITS com status COMPLETED
    const completedCredit = await prisma.transaction.aggregate({
      where: { partnerId, type: 'CREDIT', status: 'COMPLETED' },
      _sum: { amount: true }
    });

    // Saques já realizados = soma de DEBITS com status COMPLETED
    const completedDebit = await prisma.transaction.aggregate({
      where: { partnerId, type: 'DEBIT', status: 'COMPLETED' },
      _sum: { amount: true }
    });

    // Saldo pendente = CREDITS com status PENDING (aguardando liberação)
    const pendingCredit = await prisma.transaction.aggregate({
      where: { partnerId, type: 'CREDIT', status: 'PENDING' },
      _sum: { amount: true }
    });

    // Saques pendentes
    const pendingDebit = await prisma.transaction.aggregate({
      where: { partnerId, type: 'DEBIT', status: 'PENDING' },
      _sum: { amount: true }
    });

    const totalReceived = completedCredit._sum.amount || 0;
    const totalWithdrawn = completedDebit._sum.amount || 0;
    const balance = totalReceived - totalWithdrawn;
    const pendingBalance = pendingCredit._sum.amount || 0;
    const pendingWithdrawal = pendingDebit._sum.amount || 0;

    return {
      balance: Math.max(0, balance),
      pendingBalance,
      pendingWithdrawal,
      totalRevenue: totalReceived,
      transactions
    };
  }

  /**
   * Retorna estatísticas detalhadas para o dashboard avançado.
   */
  async getDetailedStats(partnerId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    // Buscar todas as transações do ano para cálculos de média e totais
    const transactions = await prisma.transaction.findMany({
      where: { 
        partnerId, 
        type: 'CREDIT', 
        status: 'COMPLETED',
        createdAt: { gte: startOfYear }
      }
    });

    const totalRevenueYear = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const monthsThisYear = now.getMonth() + 1;
    const monthlyAverage = totalRevenueYear / monthsThisYear;

    // Total de agendamentos este mês
    const totalAppointments = await prisma.appointment.count({
      where: {
        partnerId,
        status: 'COMPLETED',
        dateTime: { gte: startOfMonth }
      }
    });

    const wallet = await this.getWalletStats(partnerId);

    return {
      ...wallet,
      monthlyAverage,
      totalAppointments,
      yearTotal: totalRevenueYear
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

  /**
   * Processa a liquidação de repasses pendentes (D+30).
   * Transforma créditos PENDING em COMPLETED após a janela de segurança.
   */
  async processLiquidations() {
    const frequencies = ['7', '15', '30'];
    let totalUpdated = 0;

    for (const freq of frequencies) {
      const days = parseInt(freq);
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - days);

      // Buscar parceiros com esta frequência configurada no JSON settings
      const partners = await prisma.partner.findMany({
        where: {
          settings: {
            path: ['withdrawDay'],
            equals: freq
          }
        },
        select: { id: true }
      });

      const partnerIds = partners.map(p => p.id);

      if (partnerIds.length > 0) {
        const result = await prisma.transaction.updateMany({
          where: {
            partnerId: { in: partnerIds },
            type: 'CREDIT',
            status: 'PENDING',
            createdAt: { lt: thresholdDate }
          },
          data: {
            status: 'COMPLETED',
            paymentDate: new Date()
          }
        });
        totalUpdated += result.count;
      }
    }

    // Processar parceiros sem configuração (fallback 30 dias) ou com outras configs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const fallbackResult = await prisma.transaction.updateMany({
      where: {
        type: 'CREDIT',
        status: 'PENDING',
        createdAt: { lt: thirtyDaysAgo }
      },
      data: {
        status: 'COMPLETED',
        paymentDate: new Date()
      }
    });

    return totalUpdated + fallbackResult.count;
  }
}

export const financeService = new FinanceService();
