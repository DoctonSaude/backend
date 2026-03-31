/**
 * PROJETO CÉREBRO - FASE 2: JOB DE CÁLCULO DE SIMILARIDADES
 * Processamento em lote para calcular similaridades entre usuários e itens
 * Execução automática para manter recomendações atualizadas
 */

import cron from 'node-cron';
import CollaborativeFilteringService from '../services/collaborative-filtering.service';

export class SimilarityCalculationJobs {
  private collaborativeService: CollaborativeFilteringService;
  
  constructor() {
    this.collaborativeService = new CollaborativeFilteringService();
  }

  /**
   * Inicializa todos os jobs de cálculo de similaridade
   */
  initializeJobs(): void {
    console.log('🔄 Initializing Similarity Calculation Jobs...');

    // Job 1: Cálculo completo de similaridades (diário às 02:00)
    cron.schedule('0 2 * * *', async () => {
      await this.runFullSimilarityCalculation();
    });

    // Job 2: Atualização incremental (a cada 4 horas)
    cron.schedule('0 */4 * * *', async () => {
      await this.runIncrementalUpdate();
    });

    // Job 3: Limpeza de similaridades antigas (semanal, domingo às 03:00)
    cron.schedule('0 3 * * 0', async () => {
      await this.cleanupOldSimilarities();
    });

    // Job 4: Relatório de qualidade das similaridades (segunda às 08:00)
    cron.schedule('0 8 * * 1', async () => {
      await this.generateSimilarityQualityReport();
    });

    // Job 5: Otimização de performance (mensal, dia 1 às 04:00)
    cron.schedule('0 4 1 * *', async () => {
      await this.optimizeSimilarityIndexes();
    });

    console.log('✅ Similarity Calculation Jobs initialized');
  }

  /**
   * JOB 1: Cálculo completo de similaridades
   * Execução: Diário às 02:00
   */
  private async runFullSimilarityCalculation(): Promise<void> {
    const startTime = Date.now();
    console.log('🔄 Starting full similarity calculation...');

    try {
      // Executar cálculo em lote
      const results = await this.collaborativeService.batchCalculateSimilarities();
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Full similarity calculation completed:
        - User similarities: ${results.userSimilarities}
        - Item similarities: ${results.itemSimilarities}
        - Processing time: ${duration}ms
        - Performance: ${((results.userSimilarities + results.itemSimilarities) / (duration / 1000)).toFixed(2)} similarities/sec
      `);

      // Registrar métricas
      await this.logJobMetrics('full_similarity_calculation', {
        user_similarities: results.userSimilarities,
        item_similarities: results.itemSimilarities,
        processing_time: duration,
        performance_rate: (results.userSimilarities + results.itemSimilarities) / (duration / 1000)
      });

    } catch (error) {
      console.error('❌ Error in full similarity calculation:', error);
      
      // Registrar erro
      await this.logJobError('full_similarity_calculation', error);
    }
  }

  /**
   * JOB 2: Atualização incremental
   * Execução: A cada 4 horas
   */
  private async runIncrementalUpdate(): Promise<void> {
    console.log('🔄 Starting incremental similarity update...');

    try {
      // Buscar novas interações desde a última execução
      const lastUpdate = await this.getLastIncrementalUpdate();
      const newInteractions = await this.getNewInteractionsSince(lastUpdate);

      if (newInteractions.length === 0) {
        console.log('ℹ️ No new interactions found, skipping incremental update');
        return;
      }

      console.log(`📊 Processing ${newInteractions.length} new interactions`);

      // Atualizar similaridades incrementalmente
      await this.collaborativeService.updateSimilaritiesIncremental(newInteractions);

      // Atualizar timestamp da última execução
      await this.updateLastIncrementalUpdate();

      console.log(`✅ Incremental update completed for ${newInteractions.length} interactions`);

    } catch (error) {
      console.error('❌ Error in incremental update:', error);
      await this.logJobError('incremental_similarity_update', error);
    }
  }

  /**
   * JOB 3: Limpeza de similaridades antigas
   * Execução: Semanal, domingo às 03:00
   */
  private async cleanupOldSimilarities(): Promise<void> {
    console.log('🧹 Starting similarity cleanup...');

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Remover similaridades > 30 dias

      const cleanupResults = {
        user_similarities_removed: await this.removeOldUserSimilarities(cutoffDate),
        item_similarities_removed: await this.removeOldItemSimilarities(cutoffDate),
        low_confidence_removed: await this.removeLowConfidenceSimilarities(0.1) // Remover < 10% confiança
      };

      console.log(`✅ Similarity cleanup completed:
        - Old user similarities removed: ${cleanupResults.user_similarities_removed}
        - Old item similarities removed: ${cleanupResults.item_similarities_removed}
        - Low confidence similarities removed: ${cleanupResults.low_confidence_removed}
      `);

      await this.logJobMetrics('similarity_cleanup', cleanupResults);

    } catch (error) {
      console.error('❌ Error in similarity cleanup:', error);
      await this.logJobError('similarity_cleanup', error);
    }
  }

  /**
   * JOB 4: Relatório de qualidade das similaridades
   * Execução: Segunda às 08:00
   */
  private async generateSimilarityQualityReport(): Promise<void> {
    console.log('📊 Generating similarity quality report...');

    try {
      const report = {
        timestamp: new Date().toISOString(),
        
        // Estatísticas gerais
        total_user_similarities: await this.countUserSimilarities(),
        total_item_similarities: await this.countItemSimilarities(),
        
        // Qualidade das similaridades
        avg_user_similarity: await this.getAverageUserSimilarity(),
        avg_item_similarity: await this.getAverageItemSimilarity(),
        
        // Distribuição de confiança
        confidence_distribution: await this.getSimilarityConfidenceDistribution(),
        
        // Cobertura
        users_with_similarities: await this.countUsersWithSimilarities(),
        items_with_similarities: await this.countItemsWithSimilarities(),
        
        // Performance das recomendações
        recommendation_performance: await this.getRecommendationPerformanceMetrics(),
        
        // Alertas de qualidade
        quality_alerts: await this.generateQualityAlerts()
      };

      console.log(`📈 Similarity Quality Report:
        - Total user similarities: ${report.total_user_similarities}
        - Total item similarities: ${report.total_item_similarities}
        - Average user similarity: ${report.avg_user_similarity?.toFixed(3)}
        - Average item similarity: ${report.avg_item_similarity?.toFixed(3)}
        - Users with similarities: ${report.users_with_similarities}
        - Items with similarities: ${report.items_with_similarities}
        - Quality alerts: ${report.quality_alerts.length}
      `);

      // Salvar relatório
      await this.saveSimilarityQualityReport(report);

      // Enviar alertas se necessário
      if (report.quality_alerts.length > 0) {
        await this.sendQualityAlerts(report.quality_alerts);
      }

    } catch (error) {
      console.error('❌ Error generating similarity quality report:', error);
      await this.logJobError('similarity_quality_report', error);
    }
  }

  /**
   * JOB 5: Otimização de performance
   * Execução: Mensal, dia 1 às 04:00
   */
  private async optimizeSimilarityIndexes(): Promise<void> {
    console.log('⚡ Starting similarity index optimization...');

    try {
      const optimizationResults = {
        indexes_rebuilt: 0,
        query_performance_improvement: 0,
        storage_space_saved: 0
      };

      // Recriar índices de similaridade de usuários
      console.log('🔄 Rebuilding user similarity indexes...');
      await this.rebuildUserSimilarityIndexes();
      optimizationResults.indexes_rebuilt++;

      // Recriar índices de similaridade de itens
      console.log('🔄 Rebuilding item similarity indexes...');
      await this.rebuildItemSimilarityIndexes();
      optimizationResults.indexes_rebuilt++;

      // Otimizar armazenamento
      console.log('🔄 Optimizing similarity storage...');
      const spaceSaved = await this.optimizeSimilarityStorage();
      optimizationResults.storage_space_saved = spaceSaved;

      // Medir melhoria de performance
      const performanceImprovement = await this.measureQueryPerformanceImprovement();
      optimizationResults.query_performance_improvement = performanceImprovement;

      console.log(`✅ Similarity optimization completed:
        - Indexes rebuilt: ${optimizationResults.indexes_rebuilt}
        - Query performance improvement: ${optimizationResults.query_performance_improvement}%
        - Storage space saved: ${optimizationResults.storage_space_saved}MB
      `);

      await this.logJobMetrics('similarity_optimization', optimizationResults);

    } catch (error) {
      console.error('❌ Error in similarity optimization:', error);
      await this.logJobError('similarity_optimization', error);
    }
  }

  // MÉTODOS AUXILIARES

  private async getLastIncrementalUpdate(): Promise<string> {
    // Mock - implementar busca real do último timestamp
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    return fourHoursAgo.toISOString();
  }

  private async getNewInteractionsSince(timestamp: string): Promise<any[]> {
    // Mock - implementar busca real de novas interações
    return [
      {
        user_id: 'user123',
        item_id: 'challenge_1',
        interaction_type: 'completou',
        timestamp: new Date().toISOString()
      }
    ];
  }

  private async updateLastIncrementalUpdate(): Promise<void> {
    // Mock - implementar atualização real do timestamp
    console.log('📝 Updated last incremental update timestamp');
  }

  private async removeOldUserSimilarities(cutoffDate: Date): Promise<number> {
    // Mock - implementar remoção real
    console.log(`🗑️ Removing user similarities older than ${cutoffDate.toISOString()}`);
    return Math.floor(Math.random() * 100) + 50;
  }

  private async removeOldItemSimilarities(cutoffDate: Date): Promise<number> {
    // Mock - implementar remoção real
    console.log(`🗑️ Removing item similarities older than ${cutoffDate.toISOString()}`);
    return Math.floor(Math.random() * 200) + 100;
  }

  private async removeLowConfidenceSimilarities(threshold: number): Promise<number> {
    // Mock - implementar remoção real
    console.log(`🗑️ Removing similarities with confidence < ${threshold}`);
    return Math.floor(Math.random() * 50) + 20;
  }

  private async countUserSimilarities(): Promise<number> {
    // Mock - implementar contagem real
    return Math.floor(Math.random() * 10000) + 5000;
  }

  private async countItemSimilarities(): Promise<number> {
    // Mock - implementar contagem real
    return Math.floor(Math.random() * 5000) + 2000;
  }

  private async getAverageUserSimilarity(): Promise<number> {
    // Mock - implementar cálculo real
    return 0.45 + (Math.random() * 0.2);
  }

  private async getAverageItemSimilarity(): Promise<number> {
    // Mock - implementar cálculo real
    return 0.38 + (Math.random() * 0.25);
  }

  private async getSimilarityConfidenceDistribution(): Promise<Record<string, number>> {
    // Mock - implementar distribuição real
    return {
      'very_low': 15,    // 0-0.2
      'low': 25,         // 0.2-0.4
      'medium': 35,      // 0.4-0.6
      'high': 20,        // 0.6-0.8
      'very_high': 5     // 0.8-1.0
    };
  }

  private async countUsersWithSimilarities(): Promise<number> {
    // Mock - implementar contagem real
    return Math.floor(Math.random() * 2000) + 1500;
  }

  private async countItemsWithSimilarities(): Promise<number> {
    // Mock - implementar contagem real
    return Math.floor(Math.random() * 500) + 300;
  }

  private async getRecommendationPerformanceMetrics(): Promise<any> {
    // Mock - implementar métricas reais
    return {
      avg_click_through_rate: 32.5,
      avg_completion_rate: 68.2,
      avg_user_satisfaction: 4.3,
      recommendation_coverage: 85.7
    };
  }

  private async generateQualityAlerts(): Promise<string[]> {
    const alerts: string[] = [];
    
    // Verificar alertas de qualidade
    const avgUserSim = await this.getAverageUserSimilarity();
    if (avgUserSim < 0.3) {
      alerts.push('Average user similarity below threshold (0.3)');
    }
    
    const usersWithSim = await this.countUsersWithSimilarities();
    if (usersWithSim < 1000) {
      alerts.push('Low user similarity coverage (<1000 users)');
    }
    
    return alerts;
  }

  private async saveSimilarityQualityReport(report: any): Promise<void> {
    // Mock - implementar salvamento real
    console.log('💾 Saving similarity quality report');
  }

  private async sendQualityAlerts(alerts: string[]): Promise<void> {
    // Mock - implementar envio real de alertas
    console.log(`🚨 Sending ${alerts.length} quality alerts:`, alerts);
  }

  private async rebuildUserSimilarityIndexes(): Promise<void> {
    // Mock - implementar reconstrução real de índices
    console.log('🔄 Rebuilding user similarity indexes...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular processamento
  }

  private async rebuildItemSimilarityIndexes(): Promise<void> {
    // Mock - implementar reconstrução real de índices
    console.log('🔄 Rebuilding item similarity indexes...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular processamento
  }

  private async optimizeSimilarityStorage(): Promise<number> {
    // Mock - implementar otimização real
    console.log('🔄 Optimizing similarity storage...');
    return Math.floor(Math.random() * 100) + 50; // MB saved
  }

  private async measureQueryPerformanceImprovement(): Promise<number> {
    // Mock - implementar medição real
    return Math.floor(Math.random() * 30) + 10; // % improvement
  }

  private async logJobMetrics(jobName: string, metrics: any): Promise<void> {
    console.log(`📊 Job metrics for ${jobName}:`, metrics);
    // Implementar logging real (banco, monitoring, etc.)
  }

  private async logJobError(jobName: string, error: any): Promise<void> {
    console.error(`❌ Job error for ${jobName}:`, error);
    // Implementar logging de erro real (alertas, monitoring, etc.)
  }
}

// Instância singleton para uso global
export const similarityCalculationJobs = new SimilarityCalculationJobs();
