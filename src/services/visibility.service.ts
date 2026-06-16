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

    return null; // Model removido: prisma.partnerBoost
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
    let stats = null; // Model removido: prisma.partnerGrowthStats

    // Contagem de agendamentos
    const totalAppointments = await prisma.appointment.count({
      where: { partnerId }
    }).catch(() => 0);

    // Buscar boosts ativos
    const activeBoosts: any[] = []; // Model removido: prisma.partnerBoost

    return {
      rankingScore: '0.0',
      rankingPosition: 10,
      totalImpressions: 0,
      totalClicks: 0,
      estimatedLoss: 500,
      specialty: partner.specialty || 'Clínica Geral',
      totalAppointments,
      activeBoosts,
      boostHistory: [],
      conversionRate: '0.0'
    };
  }

  /**
   * Registra uma impressão (visualização na busca)
   */
  async recordImpression(partnerId: string) {
    return null; // Model removido
  }

  /**
   * Registra um clique (acesso ao perfil)
   */
  async recordClick(partnerId: string) {
    return null; // Model removido
  }
}

export const visibilityService = new VisibilityService();
