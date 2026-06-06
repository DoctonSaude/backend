import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { GrowthEngineService } from '../services/growthEngine.service.js';

export class GrowthEngineJobs {
  /**
   * Inicia os jobs do Motor de Crescimento.
   */
  static startAllJobs(): void {
    console.log('🚀 Starting Growth Engine Core Jobs...');
    
    // 1. Geração de Insights IA (Diariamente às 01:00)
    this.startInsightGeneration();
    
    // 2. Execução de Campanhas Agendadas (A cada hora)
    this.startCampaignExecution();
    
    console.log('✅ Growth Engine Jobs initialized');
  }

  /**
   * Gera novos insights para todos os parceiros ativos.
   */
  private static startInsightGeneration(): void {
    cron.schedule('0 1 * * *', async () => {
      try {
        console.log('🧠 [GROWTH] Gerando insights automáticos...');
        const partners = await prisma.partner.findMany({ where: { isApproved: true } });
        
        for (const partner of partners) {
          await GrowthEngineService.generateInsights(partner.id);
          // Pequeno throttle
          await new Promise(r => setTimeout(r, 1000));
        }
        
        console.log(`✅ [GROWTH] Insights gerados para ${partners.length} parceiros.`);
      } catch (error) {
        console.error('❌ [GROWTH] Erro no job de insights:', error);
      }
    }, { timezone: 'America/Sao_Paulo' });
  }

  /**
   * Verifica e executa campanhas que estão em status ACTIVE.
   */
  private static startCampaignExecution(): void {
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('📤 [GROWTH] Verificando campanhas para execução...');
        const activeCampaigns = await prisma.marketingCampaign.findMany({
          where: { status: 'ACTIVE' }
        });

        for (const campaign of activeCampaigns) {
          // Se a campanha já tem mais de 1h ativa e não terminou, executamos
          // (No futuro podemos ter agendamento fino)
          await GrowthEngineService.executeCampaign(campaign.id);
        }

        if (activeCampaigns.length > 0) {
          console.log(`✅ [GROWTH] ${activeCampaigns.length} campanhas processadas.`);
        }
      } catch (error) {
        console.error('❌ [GROWTH] Erro na execução de campanhas:', error);
      }
    }, { timezone: 'America/Sao_Paulo' });
  }
}
