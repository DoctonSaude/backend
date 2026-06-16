import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import lumaProactiveService from './ai/lumaProactive.service.js';
import unifiedNotificationService from './unifiedNotification.service.js';
import prisma from '../lib/prisma.js';

class CronService {
  public start() {
    logger.info('[CronService] Iniciando rotinas agendadas...');

    // 1. Resumo Diário de Saúde da Luma (Todos os dias às 20:00)
    cron.schedule('0 20 * * *', () => {
      logger.info('[Cron] Executando resumo de saúde diário (Luma)...');
      lumaProactiveService.sendDailyHealthSummary();
    });

    // 2. Lembrete de Check-in Gamificação (Todos os dias às 10:00 e 18:00)
    cron.schedule('0 10,18 * * *', async () => {
      logger.info('[CronService] Executando rotina: Lembrete de Check-in');
      try {
        // Enviar para um grupo pequeno ou todos (demo limite de 50)
        const patients = await prisma.patient.findMany({
          take: 50,
          select: { userId: true }
        });
        
        for (const p of patients) {
          if (!p.userId) continue;
          await unifiedNotificationService.notify({
            userId: p.userId,
            title: 'Hora do Check-in! 🏆',
            message: 'Não se esqueça de registrar seu humor e saúde hoje para ganhar Docton Coins e não perder sua ofensiva!',
            priority: 'normal',
            link: '/patient/desafios',
            data: { type: 'gamification_reminder' }
          }, ['in-app', 'push']);
        }
      } catch (error) {
        logger.error('[CronService] Erro na rotina de Check-in:', error);
      }
    });

    logger.info('[CronService] Rotinas agendadas com sucesso.');
  }
}

export default new CronService();
