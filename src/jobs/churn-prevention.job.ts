/**
 * JOBS AUTOMATIZADOS PARA PREVENÇÃO DE CHURN
 * Executa tarefas periódicas das 3 fases da estratégia anti-churn
 */

import cron from 'node-cron';
import { ChurnPreventionService } from '../services/churn-prevention.service';

const churnService = new ChurnPreventionService();

export class ChurnPreventionJobs {
  
  /**
   * Inicia todos os jobs de prevenção de churn
   */
  static startAllJobs(): void {
    console.log('🚀 Starting Churn Prevention Jobs...');
    
    // FASE 2: PREVENÇÃO - Jobs Proativos
    this.startHealthScoreCalculation();
    this.startReactivationCampaigns();
    this.startProactiveInterventions();
    this.startOnboardingOptimization();
    
    // FASE 1: DIAGNÓSTICO - Jobs de Análise
    this.startChurnAnalysis();
    this.startBehaviorAnalysis();
    
    // FASE 3: TRATAMENTO - Jobs de Monitoramento
    this.startRetentionMonitoring();
    this.startWinBackCampaigns();
    
    console.log('✅ All Churn Prevention Jobs started successfully');
  }

  // FASE 2: PREVENÇÃO

  /**
   * Calcula Health Score de todos os usuários diariamente
   * Executa todo dia às 02:00
   */
  private static startHealthScoreCalculation(): void {
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('📊 Starting daily Health Score calculation...');
        
        const users = await churnService.getAllActiveUsers();
        let processedUsers = 0;
        let atRiskUsers = 0;
        
        for (const user of users) {
          try {
            const healthScore = await churnService.calculateHealthScore(user.id);
            
            if (healthScore.riskLevel === 'HIGH' || healthScore.riskLevel === 'CRITICAL') {
              atRiskUsers++;
              
              // Notificar CS team para usuários críticos
              if (healthScore.riskLevel === 'CRITICAL') {
                await this.notifyCSTeam(user, healthScore);
              }
            }
            
            processedUsers++;
            
            // Pequeno delay para não sobrecarregar o sistema
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.error(`Error calculating health score for user ${user.id}:`, error);
          }
        }
        
        console.log(`✅ Health Score calculation completed: ${processedUsers} users processed, ${atRiskUsers} at risk`);
        
        // Enviar relatório diário
        await this.sendDailyHealthScoreReport(processedUsers, atRiskUsers);
        
      } catch (error) {
        console.error('❌ Error in Health Score calculation job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });
    
    console.log('⏰ Health Score calculation job scheduled (daily at 02:00)');
  }

  /**
   * Executa campanhas de reativação para usuários inativos
   * Executa toda segunda, quarta e sexta às 09:00
   */
  private static startReactivationCampaigns(): void {
    cron.schedule('0 9 * * 1,3,5', async () => {
      try {
        console.log('📧 Starting reactivation campaigns...');
        
        await churnService.executeReactivationCampaigns();
        
        console.log('✅ Reactivation campaigns executed successfully');
        
      } catch (error) {
        console.error('❌ Error in reactivation campaigns job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });
    
    console.log('⏰ Reactivation campaigns job scheduled (Mon/Wed/Fri at 09:00)');
  }

  /**
   * Executa intervenções proativas baseadas no Health Score
   * Executa todo dia às 10:00
   */
  private static startProactiveInterventions(): void {
    cron.schedule('0 10 * * *', async () => {
      try {
        console.log('🎯 Starting proactive interventions...');
        
        await churnService.executeProactiveInterventions();
        
        console.log('✅ Proactive interventions executed successfully');
        
      } catch (error) {
        console.error('❌ Error in proactive interventions job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });
    
    console.log('⏰ Proactive interventions job scheduled (daily at 10:00)');
  }

  /**
   * Otimiza onboarding baseado em dados de ativação
   * Executa toda segunda às 08:00
   */
  private static startOnboardingOptimization(): void {
    cron.schedule('0 8 * * 1', async () => {
      try {
        console.log('🎯 Starting onboarding optimization analysis...');
        
        // Analisar dados de ativação da semana passada
        const activationData = await this.analyzeWeeklyActivation();
        
        // Identificar pontos de melhoria no onboarding
        const optimizations = await this.identifyOnboardingOptimizations(activationData);
        
        // Enviar relatório para equipe de produto
        await this.sendOnboardingReport(optimizations);
        
        console.log('✅ Onboarding optimization analysis completed');
        
      } catch (error) {
        console.error('❌ Error in onboarding optimization job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });
    
    console.log('⏰ Onboarding optimization job scheduled (Mondays at 08:00)');
  }

  // FASE 1: DIAGNÓSTICO

  /**
   * Análise semanal de churn e tendências
   * Executa toda segunda às 07:00
   */
  private static startChurnAnalysis(): void {
    cron.schedule('0 7 * * 1', async () => {
      try {
        console.log('📈 Starting weekly churn analysis...');
        
        const churnMetrics = await this.calculateWeeklyChurnMetrics();
        const trends = await this.analyzeChurnTrends();
        const predictions = await this.predictNextWeekChurn();
        
        // Enviar relatório executivo
        await this.sendExecutiveChurnReport({
          metrics: churnMetrics,
          trends,
          predictions
        });
        
        console.log('✅ Weekly churn analysis completed');
        
      } catch (error) {
        console.error('❌ Error in churn analysis job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });
    
    console.log('⏰ Churn analysis job scheduled (Mondays at 07:00)');
  }

  /**
   * Análise de comportamento pré-churn
   * Executa todo dia às 03:00
   */
  private static startBehaviorAnalysis(): void {
    cron.schedule('0 3 * * *', async () => {
      try {
        console.log('🔍 Starting pre-churn behavior analysis...');
        
        // Identificar usuários que cancelaram nas últimas 24h
        const recentChurns = await this.getRecentChurns();
        
        for (const churnedUser of recentChurns) {
          // Analisar comportamento dos últimos 30 dias
          const behavior = await churnService.analyzePreChurnBehavior(churnedUser.id);
          
          // Salvar padrões identificados
          await this.saveChurnPattern(churnedUser, behavior);
        }
        
        console.log(`✅ Pre-churn behavior analysis completed for ${recentChurns.length} users`);
        
      } catch (error) {
        console.error('❌ Error in behavior analysis job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });
    
    console.log('⏰ Behavior analysis job scheduled (daily at 03:00)');
  }

  // FASE 3: TRATAMENTO

  /**
   * Monitora efetividade das estratégias de retenção
   * Executa todo dia às 16:00
   */
  private static startRetentionMonitoring(): void {
    cron.schedule('0 16 * * *', async () => {
      try {
        console.log('📊 Starting retention monitoring...');
        
        // Verificar ofertas de retenção enviadas
        const retentionOffers = await this.getActiveRetentionOffers();
        
        // Verificar respostas e efetividade
        const effectiveness = await this.calculateRetentionEffectiveness();
        
        // Ajustar estratégias baseado nos resultados
        await this.optimizeRetentionStrategies(effectiveness);
        
        console.log('✅ Retention monitoring completed');
        
      } catch (error) {
        console.error('❌ Error in retention monitoring job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });
    
    console.log('⏰ Retention monitoring job scheduled (daily at 16:00)');
  }

  /**
   * Executa campanhas de win-back para ex-clientes
   * Executa toda terça e quinta às 14:00
   */
  private static startWinBackCampaigns(): void {
    cron.schedule('0 14 * * 2,4', async () => {
      try {
        console.log('🔄 Starting win-back campaigns...');
        
        // Identificar ex-clientes elegíveis para win-back
        const eligibleUsers = await this.getWinBackEligibleUsers();
        
        for (const user of eligibleUsers) {
          // Personalizar oferta baseada no motivo do churn
          const offer = await this.generateWinBackOffer(user);
          
          // Enviar campanha personalizada
          await this.sendWinBackCampaign(user, offer);
        }
        
        console.log(`✅ Win-back campaigns sent to ${eligibleUsers.length} users`);
        
      } catch (error) {
        console.error('❌ Error in win-back campaigns job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });
    
    console.log('⏰ Win-back campaigns job scheduled (Tue/Thu at 14:00)');
  }

  // MÉTODOS AUXILIARES

  private static async notifyCSTeam(user: any, healthScore: any): Promise<void> {
    console.log(`🚨 CRITICAL USER ALERT: ${user.name} (Score: ${healthScore.score})`);
    // Implementar notificação real (Slack, email, etc.)
  }

  private static async sendDailyHealthScoreReport(processed: number, atRisk: number): Promise<void> {
    const report = {
      date: new Date().toISOString().split('T')[0],
      processedUsers: processed,
      atRiskUsers: atRisk,
      riskPercentage: ((atRisk / processed) * 100).toFixed(1)
    };
    
    console.log('📊 Daily Health Score Report:', report);
    // Implementar envio real do relatório
  }

  private static async analyzeWeeklyActivation(): Promise<any> {
    // Mock data - implementar análise real
    return {
      newUsers: 156,
      activatedUsers: 89,
      activationRate: 57.1,
      averageTimeToActivation: 4.2, // days
      dropoffPoints: [
        { step: 'goal_setting', dropoff: 23 },
        { step: 'first_challenge', dropoff: 18 },
        { step: 'progress_tracking', dropoff: 15 }
      ]
    };
  }

  private static async identifyOnboardingOptimizations(data: any): Promise<any> {
    const optimizations = [];
    
    if (data.activationRate < 60) {
      optimizations.push({
        area: 'activation_rate',
        current: data.activationRate,
        target: 70,
        recommendations: [
          'Simplificar processo de definição de metas',
          'Adicionar tutorial interativo',
          'Melhorar copy dos CTAs'
        ]
      });
    }
    
    return optimizations;
  }

  private static async sendOnboardingReport(optimizations: any): Promise<void> {
    console.log('📧 Onboarding Optimization Report:', optimizations);
    // Implementar envio real para equipe de produto
  }

  private static async calculateWeeklyChurnMetrics(): Promise<any> {
    return {
      churnRate: 4.2,
      churnedUsers: 23,
      churnedMRR: 2840,
      topReasons: ['price', 'lack_of_use', 'technical_issues']
    };
  }

  private static async analyzeChurnTrends(): Promise<any> {
    return {
      weekOverWeek: -0.3,
      monthOverMonth: -1.2,
      seasonalTrend: 'stable',
      predictedNextWeek: 4.1
    };
  }

  private static async predictNextWeekChurn(): Promise<any> {
    return {
      predictedChurnRate: 4.1,
      confidenceLevel: 78,
      atRiskUsers: 67,
      recommendedActions: [
        'Intensificar campanhas de reativação',
        'Revisar ofertas de retenção',
        'Melhorar suporte técnico'
      ]
    };
  }

  private static async sendExecutiveChurnReport(data: any): Promise<void> {
    console.log('📊 Executive Churn Report:', data);
    // Implementar envio real para executivos
  }

  private static async getRecentChurns(): Promise<any[]> {
    // Mock - implementar busca real de usuários que cancelaram
    return [
      { id: '1', name: 'User 1', canceledAt: new Date().toISOString() },
      { id: '2', name: 'User 2', canceledAt: new Date().toISOString() }
    ];
  }

  private static async saveChurnPattern(user: any, behavior: any): Promise<void> {
    console.log(`💾 Saving churn pattern for user ${user.id}:`, behavior);
    // Implementar salvamento real dos padrões
  }

  private static async getActiveRetentionOffers(): Promise<any[]> {
    // Mock - implementar busca real de ofertas ativas
    return [];
  }

  private static async calculateRetentionEffectiveness(): Promise<any> {
    return {
      totalOffers: 45,
      accepted: 18,
      declined: 27,
      acceptanceRate: 40.0,
      revenueRetained: 5670
    };
  }

  private static async optimizeRetentionStrategies(effectiveness: any): Promise<void> {
    console.log('🎯 Optimizing retention strategies based on:', effectiveness);
    // Implementar otimização automática das estratégias
  }

  private static async getWinBackEligibleUsers(): Promise<any[]> {
    // Mock - usuários que cancelaram há 30-90 dias com likelihood > 3
    return [
      { id: '1', name: 'Ex-User 1', churnReason: 'price', likelihood: 4 },
      { id: '2', name: 'Ex-User 2', churnReason: 'lack_of_use', likelihood: 5 }
    ];
  }

  private static async generateWinBackOffer(user: { churnReason?: 'price' | 'lack_of_use' | 'technical_issues' | string }): Promise<any> {
    // Personalizar oferta baseada no motivo do churn
    const offers: Record<string, { discount: number; duration: number; message: string }> = {
      price: { discount: 60, duration: 6, message: 'Volta com 60% OFF!' },
      lack_of_use: { discount: 40, duration: 3, message: 'Vamos te ajudar a criar o hábito!' },
      technical_issues: { discount: 50, duration: 3, message: 'Resolvemos os problemas!' }
    };
    
    const key = user.churnReason && offers[user.churnReason] ? user.churnReason : 'price';
    return offers[key];
  }

  private static async sendWinBackCampaign(user: any, offer: any): Promise<void> {
    console.log(`📧 Win-back campaign sent to ${user.name}:`, offer);
    // Implementar envio real da campanha
  }

  /**
   * Para jobs em caso de shutdown
   */
  static stopAllJobs(): void {
    console.log('🛑 Stopping all Churn Prevention Jobs...');
    cron.getTasks().forEach((task, name) => {
      task.stop();
      console.log(`⏹️ Stopped job: ${name}`);
    });
  }
}
