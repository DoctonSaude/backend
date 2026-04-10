import prisma from '../lib/prisma.js';

export class VisibilityService {
  /**
   * Calcula o ranking dinâmico de todos os parceiros ativos.
   * ranking = (Relevância * 0.3) + (Qualidade * 0.2) + (Proximidade * 0.2) + (PesoPlano * 0.1) + (BoostImpulso * 0.2)
   */
  async updatePartnerRanking(partnerId: string) {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        boosts: {
          where: {
            status: 'ACTIVE',
            expiresAt: {
              gt: new Date()
            }
          }
        }
      }
    });

    if (!partner) return;

    let score = 0;

    // 1. Qualidade (Baseado no Rating) - 0 a 5 -> normalizado para 0-100
    const qualityScore = (partner.rating || 4.0) / 5;
    score += qualityScore * 20; // Peso 0.2

    // 2. Peso do Plano - Escala 0-100
    let planWeight = 20; // FREE
    if (partner.planTier === 'PRO') planWeight = 60;
    if (partner.planTier === 'PREMIUM') planWeight = 100;
    score += (planWeight / 100) * 10; // Peso 0.1

    // 3. Boosts Ativos - Impacto direto forte
    let boostWeight = 0;
    const hasSearchBoost = partner.boosts.some(b => b.type === 'SEARCH_TOP');
    const hasRegionalBoost = partner.boosts.some(b => b.type === 'REGIONAL_DOMAIN');
    
    if (hasSearchBoost) boostWeight += 70;
    if (hasRegionalBoost) boostWeight += 30;
    
    score += Math.min(boostWeight, 100) * 0.4; // Peso aumentado para 0.4 conforme pedido do usuário (controlar quem e quando recebe)

    // 4. Relevância (Performance Histórica)
    let relevanceScore = 0.5;
    if (partner.totalImpressions > 0) {
      relevanceScore = partner.totalClicks / partner.totalImpressions;
    }
    score += relevanceScore * 30; // Peso 0.3

    // Atualiza o rankingScore no banco
    return await prisma.partner.update({
      where: { id: partner.id },
      data: { rankingScore: score }
    });
  }

  /**
   * Ativa um boost para um parceiro.
   */
  async activateBoost(partnerId: string, type: string, price: number, config: any = {}, durationDays: number = 30) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const boost = await prisma.partnerBoost.create({
      data: {
        partnerId,
        type,
        price,
        config,
        expiresAt,
        status: 'ACTIVE'
      }
    });

    // Recalcula ranking imediatamente
    await this.updatePartnerRanking(partnerId);

    return boost;
  }

  /**
   * Retorna estatísticas de visibilidade para o dashboard do parceiro.
   */
  async getGrowthStats(partnerId: string) {
    const partner = await prisma.partner.findFirst({
      where: { id: partnerId },
      include: {
        boosts: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!partner) throw new Error('Parceiro não encontrado');

    // Contagem de agendamentos — query separada para segurança
    const totalAppointments = await prisma.appointment.count({
      where: { partnerId }
    }).catch(() => 0);

    // Filtra boosts ativos (ACTIVE e não expirados)
    const activeBoosts = partner.boosts.filter(
      b => b.status === 'ACTIVE' && (b.expiresAt === null || new Date(b.expiresAt) > new Date())
    );

    // Psicologia da Perda: faturamento potencial perdido
    const avgTicket = (partner as any).consultationPrice || 150;
    const missedImpressions = Math.max(0, partner.totalImpressions - partner.totalClicks);
    const estimatedLoss = missedImpressions * 0.05 * avgTicket;

    // Posição no ranking
    const betterPartners = await prisma.partner.count({
      where: {
        rankingScore: { gt: partner.rankingScore },
        isApproved: true
      }
    });

    return {
      rankingScore: partner.rankingScore.toFixed(1),
      rankingPosition: betterPartners + 1,
      totalImpressions: partner.totalImpressions,
      totalClicks: partner.totalClicks,
      estimatedLoss: Math.round(estimatedLoss),
      specialty: partner.specialty || 'Clínica Geral',
      totalAppointments,
      activeBoosts: activeBoosts.map(b => ({
        id: b.id,
        type: b.type,
        expiresAt: b.expiresAt,
        price: b.price
      })),
      boostHistory: partner.boosts.map(b => ({
        id: b.id,
        type: b.type,
        status: b.status,
        expiresAt: b.expiresAt,
        price: b.price,
        createdAt: b.createdAt
      })),
      conversionRate: partner.totalImpressions > 0
        ? ((partner.totalClicks / partner.totalImpressions) * 100).toFixed(1)
        : '0.0'
    };
  }


  /**
   * Registra uma impressão (visualização na busca)
   */
  async recordImpression(partnerId: string) {
    return await prisma.partner.update({
      where: { id: partnerId },
      data: { totalImpressions: { increment: 1 } }
    });
  }

  /**
   * Registra um clique (acesso ao perfil)
   */
  async recordClick(partnerId: string) {
    await prisma.partner.update({
      where: { id: partnerId },
      data: { totalClicks: { increment: 1 } }
    });
    return await this.updatePartnerRanking(partnerId);
  }
}

export const visibilityService = new VisibilityService();
