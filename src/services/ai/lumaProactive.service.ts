import { logger } from '../../lib/logger.js';
import prisma from '../../lib/prisma.js';
import unifiedNotificationService from '../unifiedNotification.service.js';

export class LumaProactiveService {
  /**
   * Avalia uma nova métrica inserida e decide se envia um alerta proativo
   */
  async evaluateHealthMetric(userId: string, type: string, value: string, unit: string) {
    try {
      logger.info(`[LumaProactive] Avaliando métrica ${type}: ${value} ${unit} para usuário ${userId}`);
      
      let isAlarming = false;
      let title = '';
      let message = '';
      
      // Regras de negócio simples para demonstração
      if (type.toLowerCase() === 'pressão arterial') {
        const [sys, dia] = value.split('/').map(Number);
        if (sys >= 140 || dia >= 90) {
          isAlarming = true;
          title = 'Atenção com sua Pressão 🩺';
          message = 'Oi! Sou a Luma. Notei que sua pressão está um pouco alta hoje. Lembre-se de tomar seus medicamentos ou agende uma telemedicina.';
        }
      } else if (type.toLowerCase() === 'glicose') {
        const glucose = Number(value);
        if (glucose >= 126 || glucose <= 70) {
          isAlarming = true;
          title = 'Alerta de Glicemia 🩸';
          message = 'Sua glicose apresentou uma variação fora do padrão. Que tal conversarmos no chat para eu entender como você está se sentindo?';
        }
      }

      if (isAlarming) {
        // Enviar notificação imediatamente via Push e In-App
        await unifiedNotificationService.notify({
          userId,
          title,
          message,
          priority: 'high',
          link: '/patient/luma', // Redirecionar para o chat da IA
          data: { type: 'proactive_health_alert', metricType: type, value }
        }, ['in-app', 'push']);
        
        logger.info(`[LumaProactive] Alerta disparado para usuário ${userId}`);
      }
    } catch (error) {
      logger.error(`[LumaProactive] Erro ao avaliar métrica:`, error);
    }
  }

  /**
   * Resumo de saúde diário a ser disparado por CRON (ex: 20h)
   */
  async sendDailyHealthSummary() {
    try {
      // 1. Buscar pacientes que devem receber resumo (exemplo: ativos)
      const patients = await prisma.patient.findMany({
        take: 50, // Limite para demo
        select: { userId: true, User: { select: { name: true } } }
      });

      for (const p of patients) {
        if (!p.userId) continue;
        
        // Simular o resumo diário personalizado
        const firstName = p.User?.name?.split(' ')[0] || 'você';
        
        await unifiedNotificationService.notify({
          userId: p.userId,
          title: 'Seu Resumo de Saúde 📊',
          message: `Boa noite! Sou a Luma. Como foi seu dia, ${firstName}? Lembre-se de registrar suas métricas hoje para ganhar pontos!`,
          priority: 'normal',
          link: '/patient/dashboard',
          data: { type: 'daily_summary' }
        }, ['in-app', 'push']);
      }
      
      logger.info(`[LumaProactive] Resumo diário enviado para ${patients.length} pacientes.`);
    } catch (error) {
      logger.error(`[LumaProactive] Erro ao enviar resumo diário:`, error);
    }
  }
}

export default new LumaProactiveService();
