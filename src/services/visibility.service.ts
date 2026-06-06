import prisma from '../lib/prisma.js';

export class VisibilityService {
  /**
   * Calcula o ranking dinâmico de todos os parceiros ativos.
   * Lógica simplificada: Apenas baseada no Rating, pois outros campos foram removidos.
   */
  async updatePartnerRanking(_partnerId: string) {
    // rankingScore foi removido do modelo Partner. Esta função agora é um stub
    // para evitar quebras em outros serviços até que o schema seja restaurado.
    return { success: true };
  }

  /**
   * Ativa um boost para um parceiro.
   */
  async activateBoost(partnerId: string, type: string, price: number, config: any = {}, durationDays: number = 30) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    return await prisma.partnerBoost.create({
      data: {
        partnerId,
        type,
        price,
        config,
        endDate
      }
    });
  }

  /**
   * Retorna estatísticas de visibilidade para o dashboard do parceiro.
   */
  async getGrowthStats(partnerId: string) {
    const partner = await prisma.partner.findFirst({
      where: { id: partnerId }
    });

    if (!partner) throw new Error('Parceiro não encontrado');

    // Buscar ou criar estatísticas de crescimento
    let stats = await prisma.partnerGrowthStats.findUnique({
      where: { partnerId }
    });

    if (!stats) {
      stats = await prisma.partnerGrowthStats.create({
        data: { 
          partnerId,
          specialty: partner.specialty || 'Clínica Geral',
          rankingPosition: Math.floor(Math.random() * 50) + 10, // Simulação inicial
          estimatedLoss: Math.floor(Math.random() * 2000) + 500
        }
      });
    }

    // Contagem de agendamentos
    const totalAppointments = await prisma.appointment.count({
      where: { partnerId }
    }).catch(() => 0);

    // Buscar boosts ativos
    const activeBoosts = await prisma.partnerBoost.findMany({
      where: { partnerId, status: 'ACTIVE' }
    });

    return {
      rankingScore: stats.rankingScore.toFixed(1),
      rankingPosition: stats.rankingPosition,
      totalImpressions: stats.totalImpressions,
      totalClicks: stats.totalClicks,
      estimatedLoss: stats.estimatedLoss,
      specialty: stats.specialty || partner.specialty || 'Clínica Geral',
      totalAppointments,
      activeBoosts,
      boostHistory: [],
      conversionRate: stats.conversionRate.toFixed(1)
    };
  }

  /**
   * Registra uma impressão (visualização na busca)
   */
  async recordImpression(partnerId: string) {
    return await prisma.partnerGrowthStats.upsert({
      where: { partnerId },
      update: { totalImpressions: { increment: 1 } },
      create: { partnerId, totalImpressions: 1 }
    });
  }

  /**
   * Registra um clique (acesso ao perfil)
   */
  async recordClick(partnerId: string) {
    return await prisma.partnerGrowthStats.upsert({
      where: { partnerId },
      update: { totalClicks: { increment: 1 } },
      create: { partnerId, totalClicks: 1 }
    });
  }
}

export const visibilityService = new VisibilityService();
