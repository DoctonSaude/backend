import prisma from '../lib/prisma.js';
import inAppNotificationService from './inAppNotification.service.js';

export class ReengagementService {
  /**
   * Varre o banco de dados em busca de produtos que estão acabando
   * e dispara notificações personalizadas baseadas no perfil do usuário.
   */
  static async processPredictiveReplenishment() {
    console.log('[REENGAGEMENT] Iniciando job de reposição preditiva...');

    const now = new Date();
    const notificationThresholdDays = 5; // Avisar 5 dias antes
    let sentCount = 0;
    let errorCount = 0;

    try {
      // 1. Buscar estatísticas de produtos com confiança mínima (>= 0.3)
      const stats = await (prisma as any).userProductStats.findMany({
        where: {
          isRecurring: true,
          confidenceScore: { gte: 0.3 },
          lastPurchaseDate: { not: null },
          averageIntervalDays: { not: null, gt: 0 } // GUARDA: intervalo deve ser > 0
        },
        include: {
          user: {
            include: {
              patient: true
            }
          }
        },
        take: 500 // Limite de segurança para evitar sobrecarga
      });

      for (const stat of stats) {
        try {
          // GUARDA: Validar se os campos de data são objetos Date válidos
          if (!stat.lastPurchaseDate || !(stat.lastPurchaseDate instanceof Date)) continue;
          if (!stat.averageIntervalDays || !isFinite(stat.averageIntervalDays) || stat.averageIntervalDays <= 0) continue;
          if (!stat.userId) continue;

          // Calcular data prevista de término
          const predictedEmptyDate = new Date(stat.lastPurchaseDate.getTime());
          predictedEmptyDate.setDate(predictedEmptyDate.getDate() + Math.round(stat.averageIntervalDays));

          // Calcular quantos dias faltam
          const diffTime = predictedEmptyDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Se estiver dentro da janela de notificação
          if (diffDays <= notificationThresholdDays && diffDays >= 0) {
            await this.sendPersonalizedAlert(stat, diffDays);
            sentCount++;
          }
        } catch (statError) {
          // FALHA ISOLADA: um registro ruim não derruba o loop inteiro
          errorCount++;
          const errMsg = statError instanceof Error ? statError.message : String(statError);
          console.warn(`[REENGAGEMENT] Erro ao processar stat ${stat?.id}: ${errMsg}`);
        }
      }

      console.log(`[REENGAGEMENT] Job finalizado. ${sentCount} notificações enviadas. ${errorCount} erros isolados.`);
      return { sentCount, errorCount };
    } catch (error) {
      console.error('[REENGAGEMENT] Erro crítico no job de reposição:', error);
      throw error;
    }
  }

  /**
   * Envia uma notificação persuasiva baseada na PRIORIDADE do usuário.
   */
  private static async sendPersonalizedAlert(stat: any, daysLeft: number) {
    const priority = stat.user?.patient?.userPriority || 'ECONOMY';
    const productName = stat.productName || 'seu medicamento';
    const userId = stat.userId;

    // Urgência dinâmica na mensagem
    const urgencyText = daysLeft === 0 ? 'hoje' : `em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`;

    let title = '💊 Sugestão de Reposição';
    let message = `Notamos que ${productName} pode acabar ${urgencyText}. Deseja repor agora?`;

    // Personalização por perfil
    if (priority === 'ECONOMY') {
      title = '💰 Economize na Reposição';
      message = `Seu ${productName} acaba ${urgencyText}! Garantimos o menor preço se você comprar agora.`;
    } else if (priority === 'SPEED') {
      title = '⚡ Reposição Prioritária';
      message = `Não fique sem ${productName} (acaba ${urgencyText})! Entrega expressa em até 2 horas.`;
    } else if (priority === 'PROXIMITY') {
      title = '📍 Disponível Perto de Você';
      message = `${productName} acaba ${urgencyText}. Farmácia parceira a 500m com estoque disponível.`;
    }

    await inAppNotificationService.createNotification({
      userId,
      type: 'PREDICTIVE_REPLENISHMENT',
      title,
      message,
      priority: 'high',
      link: '/patient/shop',
      data: { productId: stat.id, productName, daysLeft }
    });
  }
}
