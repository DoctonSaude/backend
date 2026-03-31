/**
 * SERVIÇO DE INTEGRAÇÃO COM ROADMAP
 * FASE 3: Transforma insights NPS em ações concretas no roadmap
 */

export interface CustomerVoiceInitiative {
  id: string;
  title: string;
  description: string;
  
  // Origem do feedback
  source: {
    reportId: string;
    npsTheme: string;
    affectedUsers: number;
    businessImpact: 'REVENUE' | 'RETENTION' | 'ACQUISITION' | 'SATISFACTION';
    originalFeedbacks: string[];
  };
  
  // Priorização
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  impactScore: number; // 1-10
  effortScore: number; // 1-10
  
  // Execução
  owner: 'Head de Produto' | 'Head de Engenharia' | 'Head de Marketing' | 'Head de CS';
  assignee?: string;
  status: 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';
  
  // Timeline
  createdAt: string;
  dueDate: string;
  completedAt?: string;
  
  // Tracking de sucesso
  successMetric: string;
  baselineValue?: number;
  targetValue?: number;
  actualValue?: number;
  
  // Comunicação
  communicationPlan: {
    channels: ('email' | 'in-app' | 'release-notes' | 'social')[];
    message: string;
    scheduledDate: string;
  };
  
  labels: string[];
  epic?: string;
}

export interface ActionDecisionFramework {
  insight: string;
  category: 'BUG' | 'FEATURE' | 'UX' | 'PERFORMANCE' | 'CONTENT' | 'PRICING';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  owner: string;
  timeline: string;
  successMetric: string;
}

export interface RoadmapMetrics {
  totalInitiatives: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  completionRate: number;
  averageTimeToComplete: number;
  impactMeasured: number;
  npsImpact: number;
}

export class RoadmapIntegrationService {
  
  /**
   * Converte insight NPS em ação priorizada
   */
  async convertInsightToAction(insight: any): Promise<ActionDecisionFramework> {
    const category = this.categorizeInsight(insight);
    const impact = this.calculateImpact(insight);
    const effort = await this.estimateEffort(insight);
    
    const action: ActionDecisionFramework = {
      insight: insight.description,
      category,
      impact,
      effort,
      priority: this.calculatePriority(impact, effort),
      owner: this.assignOwner(category),
      timeline: this.estimateTimeline(impact, effort),
      successMetric: this.defineSuccessMetric(category, insight)
    };
    
    return action;
  }

  /**
   * Cria iniciativa da voz do cliente
   */
  async createCustomerVoiceInitiative(data: Partial<CustomerVoiceInitiative>): Promise<CustomerVoiceInitiative> {
    const initiative: CustomerVoiceInitiative = {
      id: `cvi_${Date.now()}`,
      title: data.title!,
      description: data.description!,
      source: data.source!,
      priority: data.priority || 'P2',
      impactScore: data.impactScore || this.calculateImpactScore(data.source!),
      effortScore: data.effortScore || await this.estimateEffortScore(data.title!),
      owner: data.owner || 'Head de Produto',
      assignee: data.assignee,
      status: 'BACKLOG',
      createdAt: new Date().toISOString(),
      dueDate: data.dueDate || this.calculateDueDate(data.priority || 'P2'),
      successMetric: data.successMetric || this.generateSuccessMetric(data.title!),
      communicationPlan: data.communicationPlan || this.generateCommunicationPlan(data.title!),
      labels: ['voice-of-customer', 'nps-driven', ...(data.labels || [])],
      epic: data.epic
    };

    // Salvar no sistema de projetos
    await this.saveToProjectManagement(initiative);
    
    // Notificar owner
    await this.notifyOwner(initiative);
    
    console.log(`📋 Customer Voice Initiative created: ${initiative.id}`);
    return initiative;
  }

  /**
   * Cria múltiplas tarefas baseadas em relatório NPS
   */
  async createTasksFromNPSReport(report: any): Promise<CustomerVoiceInitiative[]> {
    const initiatives: CustomerVoiceInitiative[] = [];
    
    for (const action of report.recommendedActions) {
      // Só criar tarefas para prioridades altas
      if (['URGENT', 'HIGH'].includes(action.priority)) {
        const initiative = await this.createCustomerVoiceInitiative({
          title: action.action,
          description: this.generateTaskDescription(action, report),
          priority: this.mapPriority(action.priority),
          owner: action.owner as any,
          source: {
            reportId: report.reportId,
            npsTheme: action.action,
            affectedUsers: this.calculateAffectedUsers(action),
            businessImpact: this.identifyBusinessImpact(action),
            originalFeedbacks: this.extractOriginalFeedbacks(action, report)
          },
          successMetric: action.estimatedImpact,
          labels: [action.priority.toLowerCase(), 'urgent-feedback']
        });
        
        initiatives.push(initiative);
      }
    }
    
    console.log(`✅ Created ${initiatives.length} initiatives from NPS report ${report.reportId}`);
    return initiatives;
  }

  /**
   * Atualiza status de uma iniciativa
   */
  async updateInitiativeStatus(
    initiativeId: string, 
    status: CustomerVoiceInitiative['status'],
    notes?: string
  ): Promise<void> {
    const initiative = await this.getInitiativeById(initiativeId);
    if (!initiative) {
      throw new Error(`Initiative ${initiativeId} not found`);
    }

    const oldStatus = initiative.status;
    initiative.status = status;
    
    // Se completou, registrar data
    if (status === 'DONE') {
      initiative.completedAt = new Date().toISOString();
      
      // Medir impacto se possível
      await this.measureImpact(initiative);
      
      // Preparar comunicação
      await this.prepareFeedbackCommunication(initiative);
    }
    
    await this.saveToProjectManagement(initiative);
    
    console.log(`📊 Initiative ${initiativeId} status: ${oldStatus} → ${status}`);
    
    // Notificar mudança de status
    await this.notifyStatusChange(initiative, oldStatus, notes);
  }

  /**
   * Mede impacto de uma iniciativa completada
   */
  async measureImpact(initiative: CustomerVoiceInitiative): Promise<void> {
    try {
      // Buscar métricas antes/depois da implementação
      const beforeMetrics = await this.getMetricsBeforeImplementation(initiative);
      const afterMetrics = await this.getMetricsAfterImplementation(initiative);
      
      // Calcular impacto
      const impact = this.calculateRealImpact(beforeMetrics, afterMetrics, initiative);
      
      // Salvar resultado
      initiative.actualValue = impact.actualValue;
      
      console.log(`📈 Impact measured for ${initiative.id}:`, impact);
      
    } catch (error) {
      console.error('Error measuring impact:', error);
    }
  }

  /**
   * Gera métricas do roadmap
   */
  async getRoadmapMetrics(): Promise<RoadmapMetrics> {
    const initiatives = await this.getAllCustomerVoiceInitiatives();
    
    return {
      totalInitiatives: initiatives.length,
      byStatus: this.groupByStatus(initiatives),
      byPriority: this.groupByPriority(initiatives),
      completionRate: this.calculateCompletionRate(initiatives),
      averageTimeToComplete: this.calculateAverageTime(initiatives),
      impactMeasured: initiatives.filter(i => i.actualValue !== undefined).length,
      npsImpact: await this.calculateNPSImpact(initiatives)
    };
  }

  /**
   * Busca iniciativas por filtros
   */
  async getInitiatives(filters: {
    status?: string;
    priority?: string;
    owner?: string;
    epic?: string;
  } = {}): Promise<CustomerVoiceInitiative[]> {
    let initiatives = await this.getAllCustomerVoiceInitiatives();
    
    if (filters.status) {
      initiatives = initiatives.filter(i => i.status === filters.status);
    }
    
    if (filters.priority) {
      initiatives = initiatives.filter(i => i.priority === filters.priority);
    }
    
    if (filters.owner) {
      initiatives = initiatives.filter(i => i.owner === filters.owner);
    }
    
    if (filters.epic) {
      initiatives = initiatives.filter(i => i.epic === filters.epic);
    }
    
    return initiatives.sort((a, b) => {
      const priorityOrder = { 'P0': 4, 'P1': 3, 'P2': 2, 'P3': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // MÉTODOS AUXILIARES

  private categorizeInsight(insight: any): ActionDecisionFramework['category'] {
    const text = insight.description.toLowerCase();
    
    if (text.includes('bug') || text.includes('erro') || text.includes('problema')) {
      return 'BUG';
    }
    
    if (text.includes('lento') || text.includes('performance') || text.includes('demora')) {
      return 'PERFORMANCE';
    }
    
    if (text.includes('confuso') || text.includes('difícil') || text.includes('usabilidade')) {
      return 'UX';
    }
    
    if (text.includes('funcionalidade') || text.includes('feature') || text.includes('sugestão')) {
      return 'FEATURE';
    }
    
    if (text.includes('preço') || text.includes('caro') || text.includes('valor')) {
      return 'PRICING';
    }
    
    return 'CONTENT';
  }

  private calculateImpact(insight: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    const affectedUsers = insight.affectedUsers || 0;
    const severity = insight.severity || 'MEDIUM';
    
    if (affectedUsers > 100 || severity === 'CRITICAL') return 'HIGH';
    if (affectedUsers > 20 || severity === 'HIGH') return 'MEDIUM';
    return 'LOW';
  }

  private async estimateEffort(insight: any): Promise<'LOW' | 'MEDIUM' | 'HIGH'> {
    const category = this.categorizeInsight(insight);
    
    // Estimativas baseadas na categoria
    switch (category) {
      case 'BUG':
        return 'LOW'; // Bugs geralmente são correções rápidas
      case 'PERFORMANCE':
        return 'MEDIUM'; // Otimizações requerem análise
      case 'UX':
        return 'MEDIUM'; // Mudanças de interface
      case 'FEATURE':
        return 'HIGH'; // Novas funcionalidades são complexas
      case 'PRICING':
        return 'LOW'; // Mudanças de preço são simples
      default:
        return 'MEDIUM';
    }
  }

  private calculatePriority(impact: string, effort: string): 'P0' | 'P1' | 'P2' | 'P3' {
    // Matriz Impact vs Effort
    if (impact === 'HIGH' && effort === 'LOW') return 'P0'; // Quick wins
    if (impact === 'HIGH') return 'P1'; // Strategic projects
    if (impact === 'MEDIUM' && effort !== 'HIGH') return 'P2'; // Good bets
    return 'P3'; // Nice to have
  }

  private assignOwner(category: ActionDecisionFramework['category']): string {
    switch (category) {
      case 'BUG':
      case 'PERFORMANCE':
        return 'Head de Engenharia';
      case 'UX':
      case 'FEATURE':
        return 'Head de Produto';
      case 'PRICING':
        return 'Head de Marketing';
      default:
        return 'Head de Produto';
    }
  }

  private estimateTimeline(impact: string, effort: string): string {
    if (effort === 'LOW') return '1-2 semanas';
    if (effort === 'MEDIUM') return '2-4 semanas';
    return '1-2 meses';
  }

  private defineSuccessMetric(category: string, insight: any): string {
    switch (category) {
      case 'BUG':
        return 'Zero reports do bug por 30 dias';
      case 'PERFORMANCE':
        return 'Reduzir tempo de carregamento em 50%';
      case 'UX':
        return 'Aumentar satisfação da funcionalidade em 30%';
      case 'FEATURE':
        return 'Adoção da feature por 40% dos usuários';
      default:
        return 'Melhoria no NPS relacionado ao tema';
    }
  }

  private generateTaskDescription(action: any, report: any): string {
    return `
## 🎯 Origem: Voz do Cliente

**Relatório**: ${report.reportId}  
**Período**: ${report.period}  
**NPS Score**: ${report.npsScore}

## 📊 Contexto

${action.action}

**Impacto Estimado**: ${action.estimatedImpact}  
**Usuários Afetados**: ${this.calculateAffectedUsers(action)}

## ✅ Critérios de Sucesso

- [ ] Implementação técnica concluída
- [ ] Testes de qualidade aprovados  
- [ ] Comunicação aos usuários enviada
- [ ] Métrica de sucesso medida

## 🔄 Feedback Loop

Após implementação:
1. Monitorar impacto no NPS
2. Coletar feedback específico
3. Comunicar "Vocês pediram, nós fizemos"
4. Medir satisfação da solução
    `;
  }

  private mapPriority(npsActionPriority: string): 'P0' | 'P1' | 'P2' | 'P3' {
    switch (npsActionPriority) {
      case 'URGENT': return 'P0';
      case 'HIGH': return 'P1';
      case 'MEDIUM': return 'P2';
      default: return 'P3';
    }
  }

  private calculateAffectedUsers(action: any): number {
    // Mock - implementar cálculo real baseado no tema
    return Math.floor(Math.random() * 100) + 10;
  }

  private identifyBusinessImpact(action: any): CustomerVoiceInitiative['source']['businessImpact'] {
    const actionText = action.action.toLowerCase();
    
    if (actionText.includes('bug') || actionText.includes('performance')) {
      return 'RETENTION';
    }
    
    if (actionText.includes('feature') || actionText.includes('funcionalidade')) {
      return 'SATISFACTION';
    }
    
    if (actionText.includes('preço') || actionText.includes('plano')) {
      return 'REVENUE';
    }
    
    return 'SATISFACTION';
  }

  private extractOriginalFeedbacks(action: any, report: any): string[] {
    // Mock - implementar extração real dos feedbacks originais
    return [
      "App muito lento para carregar",
      "Funcionalidade confusa de usar",
      "Gostaria de mais opções de personalização"
    ];
  }

  // Mock methods - implementar com sistema real
  private async saveToProjectManagement(initiative: CustomerVoiceInitiative): Promise<void> {
    console.log('💾 Saving to project management system:', initiative.id);
  }

  private async notifyOwner(initiative: CustomerVoiceInitiative): Promise<void> {
    console.log(`📧 Notifying ${initiative.owner} about new initiative: ${initiative.title}`);
  }

  private async getInitiativeById(id: string): Promise<CustomerVoiceInitiative | null> {
    // Mock - implementar busca real
    return null;
  }

  private async getAllCustomerVoiceInitiatives(): Promise<CustomerVoiceInitiative[]> {
    // Mock data
    return [
      {
        id: 'cvi_1',
        title: 'Corrigir bugs de login',
        description: 'Resolver problemas de autenticação reportados pelos usuários',
        source: {
          reportId: 'voc_123',
          npsTheme: 'Bug',
          affectedUsers: 45,
          businessImpact: 'RETENTION',
          originalFeedbacks: ['Login não funciona', 'Erro ao entrar']
        },
        priority: 'P0',
        impactScore: 9,
        effortScore: 3,
        owner: 'Head de Engenharia',
        status: 'IN_PROGRESS',
        createdAt: '2024-10-15T10:00:00Z',
        dueDate: '2024-10-25T23:59:59Z',
        successMetric: 'Zero reports de bug de login por 30 dias',
        communicationPlan: {
          channels: ['email', 'in-app'],
          message: 'Corrigimos os problemas de login reportados por vocês!',
          scheduledDate: '2024-10-26T09:00:00Z'
        },
        labels: ['voice-of-customer', 'nps-driven', 'urgent']
      }
    ];
  }

  private groupByStatus(initiatives: CustomerVoiceInitiative[]): Record<string, number> {
    return initiatives.reduce((acc, init) => {
      acc[init.status] = (acc[init.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByPriority(initiatives: CustomerVoiceInitiative[]): Record<string, number> {
    return initiatives.reduce((acc, init) => {
      acc[init.priority] = (acc[init.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateCompletionRate(initiatives: CustomerVoiceInitiative[]): number {
    const completed = initiatives.filter(i => i.status === 'DONE').length;
    return initiatives.length > 0 ? (completed / initiatives.length) * 100 : 0;
  }

  private calculateAverageTime(initiatives: CustomerVoiceInitiative[]): number {
    const completed = initiatives.filter(i => i.status === 'DONE' && i.completedAt);
    
    if (completed.length === 0) return 0;
    
    const totalDays = completed.reduce((sum, init) => {
      const start = new Date(init.createdAt).getTime();
      const end = new Date(init.completedAt!).getTime();
      return sum + (end - start) / (24 * 60 * 60 * 1000);
    }, 0);
    
    return Math.round(totalDays / completed.length);
  }

  private async calculateNPSImpact(initiatives: CustomerVoiceInitiative[]): Promise<number> {
    // Mock - implementar cálculo real do impacto no NPS
    return 8; // +8 pontos de NPS
  }

  private calculateDueDate(priority: string): string {
    const days = priority === 'P0' ? 7 : priority === 'P1' ? 14 : priority === 'P2' ? 30 : 60;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  private calculateImpactScore(source: CustomerVoiceInitiative['source']): number {
    let score = 5; // Base score
    
    if (source.affectedUsers > 100) score += 3;
    else if (source.affectedUsers > 50) score += 2;
    else if (source.affectedUsers > 20) score += 1;
    
    if (source.businessImpact === 'REVENUE') score += 2;
    else if (source.businessImpact === 'RETENTION') score += 2;
    
    return Math.min(10, score);
  }

  private async estimateEffortScore(title: string): Promise<number> {
    // Mock - implementar estimativa real baseada no título
    if (title.toLowerCase().includes('bug')) return 3;
    if (title.toLowerCase().includes('feature')) return 8;
    return 5;
  }

  private generateSuccessMetric(title: string): string {
    if (title.toLowerCase().includes('bug')) {
      return 'Zero reports do problema por 30 dias';
    }
    if (title.toLowerCase().includes('performance')) {
      return 'Melhoria de 50% na métrica de performance';
    }
    return 'Aumento de 20% na satisfação relacionada';
  }

  private generateCommunicationPlan(title: string): CustomerVoiceInitiative['communicationPlan'] {
    return {
      channels: ['email', 'in-app', 'release-notes'],
      message: `Implementamos a melhoria solicitada: ${title}`,
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  private async notifyStatusChange(
    initiative: CustomerVoiceInitiative, 
    oldStatus: string, 
    notes?: string
  ): Promise<void> {
    console.log(`📊 Status change notification: ${initiative.title} (${oldStatus} → ${initiative.status})`);
  }

  private async getMetricsBeforeImplementation(initiative: CustomerVoiceInitiative): Promise<any> {
    // Mock - implementar busca real de métricas
    return { npsScore: 40, userSatisfaction: 70 };
  }

  private async getMetricsAfterImplementation(initiative: CustomerVoiceInitiative): Promise<any> {
    // Mock - implementar busca real de métricas
    return { npsScore: 45, userSatisfaction: 80 };
  }

  private calculateRealImpact(before: any, after: any, initiative: CustomerVoiceInitiative): any {
    return {
      npsImpact: after.npsScore - before.npsScore,
      satisfactionImpact: after.userSatisfaction - before.userSatisfaction,
      actualValue: after.npsScore - before.npsScore
    };
  }

  private async prepareFeedbackCommunication(initiative: CustomerVoiceInitiative): Promise<void> {
    console.log(`📢 Preparing feedback communication for: ${initiative.title}`);
    // Implementar preparação da comunicação "Vocês pediram, nós fizemos"
  }
}

export default RoadmapIntegrationService;
