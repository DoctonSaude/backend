import prisma from '../lib/prisma.js';

export class HealthIntentService {
  /**
   * Busca leads de IA (intenções de saúde) relevantes para um parceiro.
   */
  static async getLeadsForPartner(partnerId: string) {
    try {
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
        select: { specialty: true, PartnerService: { select: { name: true } } }
      });

      if (!partner) return [];

      const keywords = [partner.specialty, ...partner.PartnerService.map(s => s.name)].map(k => k.toLowerCase());

      // Busca intenções recentes
      const intents = await prisma.healthIntent.findMany({
        where: {
          intent: { in: ['APPOINTMENT', 'EXAM'] },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Últimos 7 dias
        },
        include: {
          patient: {
            include: {
              User: { select: { name: true, avatar: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return intents.filter(intent => {
        const ctx = intent.context as any;
        const specialty = ctx?.metadata?.specialty?.toLowerCase() || '';
        const description = ctx?.description?.toLowerCase() || '';
        
        return keywords.some(k => specialty.includes(k) || description.includes(k));
      });
    } catch (error) {
      console.error('[HealthIntentService] Error fetching partner leads:', error);
      return [];
    }
  }

  /**
   * Busca intenções de compra/cotação para farmácias.
   */
  static async getLeadsForPharmacy() {
    try {
      return await prisma.healthIntent.findMany({
        where: {
          intent: 'QUOTE',
          createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // Últimos 3 dias (mais urgente)
        },
        include: {
          patient: {
            include: {
              User: { select: { name: true, avatar: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      });
    } catch (error) {
      console.error('[HealthIntentService] Error fetching pharmacy leads:', error);
      return [];
    }
  }
}
