/**
 * PROJETO CÉREBRO - ANALYTICS E MÉTRICAS
 * Sistema de tracking e análise de performance das recomendações
 * Métricas de sucesso para validar efetividade da personalização
 */

export interface InteractionEvent {
  id: string;
  user_id: string;
  content_id: string;
  interaction_type: 'view' | 'click' | 'complete' | 'skip' | 'save' | 'share';
  context: 'home' | 'post_challenge' | 'discover';
  position: number;
  score: number;
  applied_rules: string[];
  session_id: string;
  timestamp: string;
  
  // Dados contextuais
  user_segment?: string;
  content_type?: string;
  recommendation_engine_version?: string;
  
  // Métricas de tempo
  time_to_click?: number; // ms desde exibição
  time_spent?: number; // ms no conteúdo
}

export interface RecommendationMetrics {
  // Métricas principais (KPIs)
  adoption_rate: number; // % usuários que clicam em recomendações
  conversion_rate: number; // % conclusões vs cliques
  retention_impact: {
    day_7: number;
    day_30: number;
    day_90: number;
  };
  
  // Métricas de performance
  click_through_rate: number; // % cliques vs visualizações
  completion_rate: number; // % conclusões vs cliques
  avg_position_clicked: number; // Posição média dos cliques
  
  // Métricas de qualidade
  user_satisfaction: number; // Rating médio do conteúdo recomendado
  diversity_score: number; // Diversidade das recomendações
  novelty_score: number; // % conteúdo novo vs já visto
  
  // Métricas de negócio
  engagement_lift: number; // % aumento no engajamento
  session_duration_impact: number; // Impacto na duração da sessão
  feature_adoption: number; // % usuários que adotam funcionalidades recomendadas
}

export interface ABTestResult {
  test_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'running' | 'completed' | 'paused';
  
  variants: {
    control: {
      name: string;
      description: string;
      users: number;
      metrics: RecommendationMetrics;
    };
    treatment: {
      name: string;
      description: string;
      users: number;
      metrics: RecommendationMetrics;
    };
  };
  
  statistical_significance: number;
  winner?: 'control' | 'treatment' | 'inconclusive';
  confidence_level: number;
}

export class RecommendationAnalyticsService {
  
  /**
   * Registra interação do usuário com recomendação
   */
  async logInteraction(data: Omit<InteractionEvent, 'id' | 'timestamp'>): Promise<void> {
    const event: InteractionEvent = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    // Salvar no banco de dados
    await this.saveInteractionEvent(event);
    
    // Processar em tempo real para métricas críticas
    await this.processRealTimeMetrics(event);
    
    console.log(`📊 Interaction logged: ${event.interaction_type} on ${event.content_id} by ${event.user_id}`);
  }

  /**
   * Calcula métricas de performance das recomendações
   */
  async calculateMetrics(
    startDate: string,
    endDate: string,
    filters?: {
      context?: string;
      user_segment?: string;
      content_type?: string;
      engine_version?: string;
    }
  ): Promise<RecommendationMetrics> {
    
    const interactions = await this.getInteractions(startDate, endDate, filters);
    
    // Agrupar por tipo de interação
    const views = interactions.filter(i => i.interaction_type === 'view');
    const clicks = interactions.filter(i => i.interaction_type === 'click');
    const completions = interactions.filter(i => i.interaction_type === 'complete');
    
    // Calcular métricas principais
    const uniqueUsers = new Set(interactions.map(i => i.user_id)).size;
    const usersWhoClicked = new Set(clicks.map(i => i.user_id)).size;
    const usersWhoCompleted = new Set(completions.map(i => i.user_id)).size;
    
    const metrics: RecommendationMetrics = {
      // KPIs principais
      adoption_rate: uniqueUsers > 0 ? (usersWhoClicked / uniqueUsers) * 100 : 0,
      conversion_rate: clicks.length > 0 ? (completions.length / clicks.length) * 100 : 0,
      retention_impact: await this.calculateRetentionImpact(startDate, endDate, filters),
      
      // Performance
      click_through_rate: views.length > 0 ? (clicks.length / views.length) * 100 : 0,
      completion_rate: clicks.length > 0 ? (completions.length / clicks.length) * 100 : 0,
      avg_position_clicked: this.calculateAveragePosition(clicks),
      
      // Qualidade
      user_satisfaction: await this.calculateUserSatisfaction(completions),
      diversity_score: this.calculateDiversityScore(interactions),
      novelty_score: await this.calculateNoveltyScore(interactions),
      
      // Negócio
      engagement_lift: await this.calculateEngagementLift(startDate, endDate, filters),
      session_duration_impact: await this.calculateSessionImpact(startDate, endDate, filters),
      feature_adoption: await this.calculateFeatureAdoption(startDate, endDate, filters)
    };
    
    return metrics;
  }

  /**
   * Executa teste A/B entre diferentes estratégias de recomendação
   */
  async runABTest(testConfig: {
    name: string;
    description: string;
    control_strategy: string;
    treatment_strategy: string;
    duration_days: number;
    traffic_split: number; // % para treatment (0-100)
    success_metric: keyof RecommendationMetrics;
    minimum_effect_size: number;
  }): Promise<string> {
    
    const testId = `ab_test_${Date.now()}`;
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + testConfig.duration_days * 24 * 60 * 60 * 1000).toISOString();
    
    const abTest = {
      test_id: testId,
      name: testConfig.name,
      description: testConfig.description,
      start_date: startDate,
      end_date: endDate,
      status: 'running' as const,
      control_strategy: testConfig.control_strategy,
      treatment_strategy: testConfig.treatment_strategy,
      traffic_split: testConfig.traffic_split,
      success_metric: testConfig.success_metric,
      minimum_effect_size: testConfig.minimum_effect_size
    };
    
    await this.saveABTest(abTest);
    
    console.log(`🧪 A/B Test started: ${testConfig.name} (${testId})`);
    return testId;
  }

  /**
   * Analisa resultados de teste A/B
   */
  async analyzeABTest(testId: string): Promise<ABTestResult> {
    const test = await this.getABTest(testId);
    if (!test) {
      throw new Error(`A/B Test ${testId} not found`);
    }
    
    // Buscar métricas para cada variante
    const controlMetrics = await this.calculateMetrics(
      test.start_date,
      test.end_date,
      { engine_version: test.control_strategy }
    );
    
    const treatmentMetrics = await this.calculateMetrics(
      test.start_date,
      test.end_date,
      { engine_version: test.treatment_strategy }
    );
    
    // Calcular significância estatística
    const { significance, confidence, winner } = this.calculateStatisticalSignificance(
      controlMetrics,
      treatmentMetrics,
      test.success_metric,
      test.minimum_effect_size
    );
    
    const result: ABTestResult = {
      test_id: testId,
      name: test.name,
      description: test.description,
      start_date: test.start_date,
      end_date: test.end_date,
      status: test.status,
      variants: {
        control: {
          name: 'Controle',
          description: test.control_strategy,
          users: await this.countTestUsers(testId, 'control'),
          metrics: controlMetrics
        },
        treatment: {
          name: 'Tratamento',
          description: test.treatment_strategy,
          users: await this.countTestUsers(testId, 'treatment'),
          metrics: treatmentMetrics
        }
      },
      statistical_significance: significance,
      winner,
      confidence_level: confidence
    };
    
    return result;
  }

  /**
   * Gera relatório de performance das recomendações
   */
  async generatePerformanceReport(
    startDate: string,
    endDate: string
  ): Promise<{
    period: string;
    overall_metrics: RecommendationMetrics;
    by_context: Record<string, RecommendationMetrics>;
    by_user_segment: Record<string, RecommendationMetrics>;
    top_performing_rules: Array<{
      rule_id: string;
      rule_name: string;
      interactions: number;
      ctr: number;
      conversion_rate: number;
    }>;
    content_insights: {
      most_recommended: Array<{
        content_id: string;
        title: string;
        recommendations: number;
        ctr: number;
      }>;
      highest_engagement: Array<{
        content_id: string;
        title: string;
        completion_rate: number;
        avg_rating: number;
      }>;
    };
    recommendations: string[];
  }> {
    
    const overallMetrics = await this.calculateMetrics(startDate, endDate);
    
    // Métricas por contexto
    const contexts = ['home', 'post_challenge', 'discover'];
    const byContext: Record<string, RecommendationMetrics> = {};
    
    for (const context of contexts) {
      byContext[context] = await this.calculateMetrics(startDate, endDate, { context });
    }
    
    // Métricas por segmento de usuário
    const segments = await this.getUserSegments();
    const byUserSegment: Record<string, RecommendationMetrics> = {};
    
    for (const segment of segments) {
      byUserSegment[segment] = await this.calculateMetrics(startDate, endDate, { user_segment: segment });
    }
    
    // Performance das regras
    const topRules = await this.getTopPerformingRules(startDate, endDate);
    
    // Insights de conteúdo
    const contentInsights = await this.getContentInsights(startDate, endDate);
    
    // Gerar recomendações de melhoria
    const recommendations = this.generateRecommendations(overallMetrics, byContext, byUserSegment);
    
    return {
      period: `${startDate} to ${endDate}`,
      overall_metrics: overallMetrics,
      by_context: byContext,
      by_user_segment: byUserSegment,
      top_performing_rules: topRules,
      content_insights: contentInsights,
      recommendations
    };
  }

  /**
   * Monitora métricas em tempo real
   */
  async getRealtimeMetrics(): Promise<{
    active_users: number;
    recommendations_served: number;
    current_ctr: number;
    avg_response_time: number;
    error_rate: number;
    top_content: Array<{ content_id: string; views: number }>;
  }> {
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentInteractions = await this.getInteractions(
      oneHourAgo.toISOString(),
      now.toISOString()
    );
    
    const views = recentInteractions.filter(i => i.interaction_type === 'view');
    const clicks = recentInteractions.filter(i => i.interaction_type === 'click');
    
    return {
      active_users: new Set(recentInteractions.map(i => i.user_id)).size,
      recommendations_served: views.length,
      current_ctr: views.length > 0 ? (clicks.length / views.length) * 100 : 0,
      avg_response_time: await this.getAverageResponseTime(),
      error_rate: await this.getErrorRate(),
      top_content: this.getTopContent(recentInteractions)
    };
  }

  // MÉTODOS AUXILIARES

  private calculateAveragePosition(clicks: InteractionEvent[]): number {
    if (clicks.length === 0) return 0;
    const totalPosition = clicks.reduce((sum, click) => sum + click.position, 0);
    return totalPosition / clicks.length;
  }

  private calculateDiversityScore(interactions: InteractionEvent[]): number {
    const contentTypes = new Set(interactions.map(i => i.content_type)).size;
    const totalInteractions = interactions.length;
    
    // Score baseado na diversidade de tipos de conteúdo
    return totalInteractions > 0 ? (contentTypes / Math.min(totalInteractions, 10)) * 100 : 0;
  }

  private async calculateNoveltyScore(interactions: InteractionEvent[]): Promise<number> {
    // Mock - implementar cálculo real baseado no histórico do usuário
    return 75; // 75% de conteúdo novo
  }

  private async calculateRetentionImpact(
    startDate: string,
    endDate: string,
    filters?: any
  ): Promise<{ day_7: number; day_30: number; day_90: number }> {
    // Mock - implementar cálculo real de impacto na retenção
    return {
      day_7: 85.2,
      day_30: 72.8,
      day_90: 64.5
    };
  }

  private async calculateUserSatisfaction(completions: InteractionEvent[]): Promise<number> {
    // Mock - implementar cálculo baseado em ratings/feedback
    return 4.3; // Rating médio de 1-5
  }

  private async calculateEngagementLift(
    startDate: string,
    endDate: string,
    filters?: any
  ): Promise<number> {
    // Mock - implementar comparação com baseline
    return 23.5; // 23.5% de aumento no engajamento
  }

  private async calculateSessionImpact(
    startDate: string,
    endDate: string,
    filters?: any
  ): Promise<number> {
    // Mock - implementar cálculo de impacto na duração da sessão
    return 18.2; // 18.2% de aumento na duração
  }

  private async calculateFeatureAdoption(
    startDate: string,
    endDate: string,
    filters?: any
  ): Promise<number> {
    // Mock - implementar cálculo de adoção de funcionalidades
    return 34.7; // 34.7% dos usuários adotam funcionalidades recomendadas
  }

  private calculateStatisticalSignificance(
    controlMetrics: RecommendationMetrics,
    treatmentMetrics: RecommendationMetrics,
    successMetric: keyof RecommendationMetrics,
    minimumEffectSize: number
  ): { significance: number; confidence: number; winner: 'control' | 'treatment' | 'inconclusive' } {
    
    const controlValue = controlMetrics[successMetric] as number;
    const treatmentValue = treatmentMetrics[successMetric] as number;
    
    const effectSize = ((treatmentValue - controlValue) / controlValue) * 100;
    
    // Mock - implementar teste estatístico real (t-test, chi-square, etc.)
    const significance = Math.abs(effectSize) > minimumEffectSize ? 0.95 : 0.6;
    
    let winner: 'control' | 'treatment' | 'inconclusive' = 'inconclusive';
    if (significance >= 0.95) {
      winner = treatmentValue > controlValue ? 'treatment' : 'control';
    }
    
    return {
      significance,
      confidence: significance * 100,
      winner
    };
  }

  private generateRecommendations(
    overall: RecommendationMetrics,
    byContext: Record<string, RecommendationMetrics>,
    bySegment: Record<string, RecommendationMetrics>
  ): string[] {
    
    const recommendations: string[] = [];
    
    // Análise de CTR
    if (overall.click_through_rate < 25) {
      recommendations.push('CTR baixo (<25%): Revisar relevância das recomendações e posicionamento visual');
    }
    
    // Análise de conversão
    if (overall.conversion_rate < 60) {
      recommendations.push('Taxa de conversão baixa (<60%): Melhorar qualidade do conteúdo recomendado');
    }
    
    // Análise de posição
    if (overall.avg_position_clicked > 3) {
      recommendations.push('Posição média de clique alta (>3): Melhorar algoritmo de ranking');
    }
    
    // Análise por contexto
    const homeMetrics = byContext['home'];
    if (homeMetrics && homeMetrics.click_through_rate < byContext['post_challenge']?.click_through_rate) {
      recommendations.push('CTR da home inferior ao pós-desafio: Otimizar recomendações da página inicial');
    }
    
    // Análise de diversidade
    if (overall.diversity_score < 50) {
      recommendations.push('Baixa diversidade (<50%): Implementar lógica anti-monotonia mais agressiva');
    }
    
    return recommendations;
  }

  private getTopContent(interactions: InteractionEvent[]): Array<{ content_id: string; views: number }> {
    const contentCounts = interactions
      .filter(i => i.interaction_type === 'view')
      .reduce((acc, interaction) => {
        acc[interaction.content_id] = (acc[interaction.content_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    return Object.entries(contentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([content_id, views]) => ({ content_id, views }));
  }

  // MÉTODOS DE DADOS (Mock - implementar com banco real)

  private async saveInteractionEvent(event: InteractionEvent): Promise<void> {
    console.log(`💾 Saving interaction event: ${event.id}`);
    // Implementar salvamento no banco
  }

  private async processRealTimeMetrics(event: InteractionEvent): Promise<void> {
    // Implementar processamento em tempo real (Redis, etc.)
  }

  private async getInteractions(
    startDate: string,
    endDate: string,
    filters?: any
  ): Promise<InteractionEvent[]> {
    // Mock data - implementar busca real no banco
    return [];
  }

  private async getUserSegments(): Promise<string[]> {
    return ['Iniciante Motivado', 'Intermediário Consistente', 'Avançado Explorador', 'Casual Esporádico'];
  }

  private async getTopPerformingRules(startDate: string, endDate: string): Promise<any[]> {
    return [
      { rule_id: 'rule_1', rule_name: 'Perda de Peso - Cardio + Nutrição', interactions: 890, ctr: 45.2, conversion_rate: 68.3 },
      { rule_id: 'rule_2', rule_name: 'Usuários Inativos - Conteúdo Motivacional', interactions: 654, ctr: 38.7, conversion_rate: 72.1 }
    ];
  }

  private async getContentInsights(startDate: string, endDate: string): Promise<any> {
    return {
      most_recommended: [
        { content_id: 'challenge_1', title: 'Desafio Caminhada Matinal', recommendations: 1250, ctr: 32.4 },
        { content_id: 'article_1', title: 'Guia de Hidratação Diária', recommendations: 890, ctr: 28.7 }
      ],
      highest_engagement: [
        { content_id: 'challenge_2', title: 'Yoga para Iniciantes', completion_rate: 78.5, avg_rating: 4.6 },
        { content_id: 'recipe_1', title: 'Smoothie Proteico', completion_rate: 82.1, avg_rating: 4.4 }
      ]
    };
  }

  private async saveABTest(test: any): Promise<void> {
    console.log(`💾 Saving A/B test: ${test.test_id}`);
  }

  private async getABTest(testId: string): Promise<any> {
    // Mock - implementar busca real
    return null;
  }

  private async countTestUsers(testId: string, variant: string): Promise<number> {
    // Mock - implementar contagem real
    return Math.floor(Math.random() * 1000) + 500;
  }

  private async getAverageResponseTime(): Promise<number> {
    return 120; // ms
  }

  private async getErrorRate(): Promise<number> {
    return 0.5; // %
  }
}

export default RecommendationAnalyticsService;
