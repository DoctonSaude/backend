/**
 * PROJETO CÉREBRO - FASE 1: MOTOR DE REGRAS
 * Sistema de recomendação baseado em regras SE-ENTÃO
 * "Automação da empatia" - entregando valor imediato
 */

export interface ContentTaxonomy {
  id: string;
  title: string;
  description: string;
  
  // Taxonomia de Conteúdo
  tipo: 'nutricao' | 'exercicio' | 'mindfulness' | 'sono' | 'hidratacao' | 'habitos';
  categoria: 'desafio' | 'artigo' | 'video' | 'receita' | 'dica';
  dificuldade: 'iniciante' | 'intermediario' | 'avancado';
  foco: 'perda_peso' | 'ganho_massa' | 'resistencia' | 'flexibilidade' | 'bem_estar' | 'energia';
  duracao: 'curta' | 'media' | 'longa'; // <15min, 15-45min, >45min
  
  // Atributos específicos
  calorias_queimadas?: number;
  equipamento_necessario?: string[];
  nivel_impacto?: 'baixo' | 'medio' | 'alto';
  momento_ideal?: 'manha' | 'tarde' | 'noite' | 'qualquer';
  
  // Métricas
  rating_medio: number;
  total_completados: number;
  taxa_conclusao: number;
  
  // Metadados
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  
  // Dados explícitos do onboarding
  meta_principal: 'perder_peso' | 'ganhar_massa' | 'melhorar_condicionamento' | 'bem_estar_geral' | 'habitos_saudaveis';
  atividades_preferidas: string[]; // ['corrida', 'musculacao', 'yoga', 'natacao', 'caminhada']
  nivel_declarado: 'iniciante' | 'intermediario' | 'avancado';
  tempo_disponivel: 'pouco' | 'medio' | 'muito'; // <30min, 30-60min, >60min
  
  // Preferências comportamentais
  horario_preferido?: 'manha' | 'tarde' | 'noite';
  frequencia_desejada?: 'diaria' | 'dias_alternados' | 'fins_semana';
  motivacao_principal?: 'saude' | 'estetica' | 'performance' | 'social';
  
  // Restrições e limitações
  restricoes_alimentares?: string[];
  limitacoes_fisicas?: string[];
  equipamentos_disponiveis?: string[];
  
  // Dados comportamentais (coletados ao longo do tempo)
  desafios_completados: number;
  tipos_mais_engajados: string[];
  horarios_mais_ativos: string[];
  taxa_conclusao_geral: number;
  
  // Segmentação
  plano_atual: string;
  dias_desde_cadastro: number;
  ultimo_acesso: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  priority: number; // 1-10, maior = mais prioritário
  active: boolean;
  
  // Condições (SE)
  conditions: {
    user_conditions?: {
      meta_principal?: string[];
      atividades_preferidas?: string[];
      nivel_declarado?: string[];
      tempo_disponivel?: string[];
      dias_desde_cadastro?: { min?: number; max?: number };
    };
    content_conditions?: {
      tipo?: string[];
      dificuldade?: string[];
      foco?: string[];
      duracao?: string[];
    };
    behavioral_conditions?: {
      taxa_conclusao_min?: number;
      desafios_completados_min?: number;
      ultimo_acesso_dias?: number;
    };
  };
  
  // Ações (ENTÃO)
  actions: {
    boost_score?: number; // Multiplicador de relevância
    priority_boost?: number; // Boost de prioridade
    exclude?: boolean; // Excluir da recomendação
    tag_required?: string[]; // Tags obrigatórias
    max_recommendations?: number; // Limite de recomendações desta regra
  };
  
  created_at: string;
  updated_at: string;
}

export interface RecommendationResult {
  content_id: string;
  score: number;
  reasoning: string[];
  applied_rules: string[];
  position: number;
}

export class RecommendationEngineService {
  
  /**
   * FASE 1: Motor de Regras Principal
   * Gera recomendações baseadas em regras de negócio
   */
  async generateRecommendations(
    userId: string, 
    context: 'home' | 'post_challenge' | 'discover' = 'home',
    limit: number = 10
  ): Promise<RecommendationResult[]> {
    
    try {
      console.log(`🧠 Generating recommendations for user ${userId} in context: ${context}`);
      
      // 1. Buscar perfil do usuário
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        console.log(`❌ User profile not found for ${userId}`);
        return await this.getFallbackRecommendations(limit);
      }
      
      // 2. Buscar conteúdo disponível
      const availableContent = await this.getAvailableContent();
      
      // 3. Buscar regras ativas
      const activeRules = await this.getActiveBusinessRules();
      
      // 4. Aplicar regras e calcular scores
      const scoredContent = await this.applyBusinessRules(
        userProfile, 
        availableContent, 
        activeRules, 
        context
      );
      
      // 5. Ordenar por score e aplicar diversificação
      const recommendations = this.rankAndDiversify(scoredContent, limit);
      
      // 6. Registrar recomendações para tracking
      await this.logRecommendations(userId, recommendations, context);
      
      console.log(`✅ Generated ${recommendations.length} recommendations for ${userId}`);
      return recommendations;
      
    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  /**
   * Aplica regras de negócio para calcular scores de relevância
   */
  private async applyBusinessRules(
    user: UserProfile,
    content: ContentTaxonomy[],
    rules: BusinessRule[],
    context: string
  ): Promise<Array<ContentTaxonomy & { score: number; reasoning: string[]; applied_rules: string[] }>> {
    
    const scoredContent = content.map(item => ({
      ...item,
      score: this.calculateBaseScore(item, user),
      reasoning: [`Score base: ${this.calculateBaseScore(item, user).toFixed(2)}`],
      applied_rules: [] as string[]
    }));
    
    // Aplicar cada regra por ordem de prioridade
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      for (const content of scoredContent) {
        if (this.ruleMatches(rule, user, content, context)) {
          // Aplicar ações da regra
          if (rule.actions.boost_score) {
            content.score *= rule.actions.boost_score;
            content.reasoning.push(`Regra "${rule.name}": boost ${rule.actions.boost_score}x`);
            content.applied_rules.push(rule.id);
          }
          
          if (rule.actions.priority_boost) {
            content.score += rule.actions.priority_boost;
            content.reasoning.push(`Regra "${rule.name}": +${rule.actions.priority_boost} prioridade`);
            content.applied_rules.push(rule.id);
          }
          
          if (rule.actions.exclude) {
            content.score = 0;
            content.reasoning.push(`Regra "${rule.name}": excluído`);
            content.applied_rules.push(rule.id);
          }
        }
      }
    }
    
    return scoredContent;
  }

  /**
   * Verifica se uma regra se aplica ao usuário e conteúdo
   */
  private ruleMatches(rule: BusinessRule, user: UserProfile, content: ContentTaxonomy, context: string): boolean {
    const { conditions } = rule;
    
    // Verificar condições do usuário
    if (conditions.user_conditions) {
      const uc = conditions.user_conditions;
      
      if (uc.meta_principal && !uc.meta_principal.includes(user.meta_principal)) return false;
      if (uc.nivel_declarado && !uc.nivel_declarado.includes(user.nivel_declarado)) return false;
      if (uc.tempo_disponivel && !uc.tempo_disponivel.includes(user.tempo_disponivel)) return false;
      
      if (uc.atividades_preferidas) {
        const hasPreferredActivity = uc.atividades_preferidas.some(activity => 
          user.atividades_preferidas.includes(activity)
        );
        if (!hasPreferredActivity) return false;
      }
      
      if (uc.dias_desde_cadastro) {
        if (uc.dias_desde_cadastro.min && user.dias_desde_cadastro < uc.dias_desde_cadastro.min) return false;
        if (uc.dias_desde_cadastro.max && user.dias_desde_cadastro > uc.dias_desde_cadastro.max) return false;
      }
    }
    
    // Verificar condições do conteúdo
    if (conditions.content_conditions) {
      const cc = conditions.content_conditions;
      
      if (cc.tipo && !cc.tipo.includes(content.tipo)) return false;
      if (cc.dificuldade && !cc.dificuldade.includes(content.dificuldade)) return false;
      if (cc.foco && !cc.foco.includes(content.foco)) return false;
      if (cc.duracao && !cc.duracao.includes(content.duracao)) return false;
    }
    
    // Verificar condições comportamentais
    if (conditions.behavioral_conditions) {
      const bc = conditions.behavioral_conditions;
      
      if (bc.taxa_conclusao_min && user.taxa_conclusao_geral < bc.taxa_conclusao_min) return false;
      if (bc.desafios_completados_min && user.desafios_completados < bc.desafios_completados_min) return false;
    }
    
    return true;
  }

  /**
   * Calcula score base baseado na compatibilidade usuário-conteúdo
   */
  private calculateBaseScore(content: ContentTaxonomy, user: UserProfile): number {
    let score = 0.5; // Score base
    
    // Compatibilidade com meta principal
    if (this.isCompatibleWithGoal(content.foco, user.meta_principal)) {
      score += 0.3;
    }
    
    // Compatibilidade com nível
    if (content.dificuldade === user.nivel_declarado) {
      score += 0.2;
    } else if (
      (content.dificuldade === 'iniciante' && user.nivel_declarado === 'intermediario') ||
      (content.dificuldade === 'intermediario' && user.nivel_declarado === 'avancado')
    ) {
      score += 0.1; // Nível ligeiramente abaixo também é bom
    }
    
    // Compatibilidade com tempo disponível
    if (this.isCompatibleWithTime(content.duracao, user.tempo_disponivel)) {
      score += 0.15;
    }
    
    // Compatibilidade com atividades preferidas
    if (user.atividades_preferidas.some(activity => 
      content.tags.includes(activity) || content.tipo === activity
    )) {
      score += 0.25;
    }
    
    // Boost baseado na qualidade do conteúdo
    score += (content.rating_medio - 3) * 0.1; // Rating 1-5, boost/penalidade baseado na média
    score += Math.min(content.taxa_conclusao, 1) * 0.1; // Boost baseado na taxa de conclusão
    
    return Math.max(0, Math.min(1, score)); // Manter entre 0 e 1
  }

  /**
   * Ordena por score e aplica diversificação
   */
  private rankAndDiversify(
    scoredContent: Array<ContentTaxonomy & { score: number; reasoning: string[]; applied_rules: string[] }>,
    limit: number
  ): RecommendationResult[] {
    
    // Filtrar conteúdo com score > 0
    const validContent = scoredContent.filter(item => item.score > 0);
    
    // Ordenar por score
    validContent.sort((a, b) => b.score - a.score);
    
    // Aplicar diversificação (evitar muitos do mesmo tipo)
    const diversified = this.applyDiversification(validContent, limit);
    
    // Converter para formato de resultado
    return diversified.map((item, index) => ({
      content_id: item.id,
      score: item.score,
      reasoning: item.reasoning,
      applied_rules: item.applied_rules,
      position: index + 1
    }));
  }

  /**
   * Aplica diversificação para evitar monotonia
   */
  private applyDiversification(
    content: Array<ContentTaxonomy & { score: number; reasoning: string[]; applied_rules: string[] }>,
    limit: number
  ): Array<ContentTaxonomy & { score: number; reasoning: string[]; applied_rules: string[] }> {
    
    const result: Array<ContentTaxonomy & { score: number; reasoning: string[]; applied_rules: string[] }> = [];
    const typeCount = new Map<string, number>();
    const maxPerType = Math.ceil(limit / 3); // Máximo 1/3 do mesmo tipo
    
    for (const item of content) {
      if (result.length >= limit) break;
      
      const currentCount = typeCount.get(item.tipo) || 0;
      
      if (currentCount < maxPerType) {
        result.push(item);
        typeCount.set(item.tipo, currentCount + 1);
      }
    }
    
    // Se não preencheu o limite, adicionar os melhores restantes
    if (result.length < limit) {
      const remaining = content.filter(item => !result.includes(item));
      result.push(...remaining.slice(0, limit - result.length));
    }
    
    return result;
  }

  /**
   * Cria e gerencia regras de negócio
   */
  async createBusinessRule(ruleData: Omit<BusinessRule, 'id' | 'created_at' | 'updated_at'>): Promise<BusinessRule> {
    const rule: BusinessRule = {
      id: `rule_${Date.now()}`,
      ...ruleData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await this.saveBusinessRule(rule);
    console.log(`📋 Business rule created: ${rule.name}`);
    return rule;
  }

  /**
   * Inicializa regras padrão do sistema
   */
  async initializeDefaultRules(): Promise<void> {
    const defaultRules: Omit<BusinessRule, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        name: 'Iniciantes - Conteúdo Fácil',
        description: 'Priorizar conteúdo iniciante para usuários novos',
        priority: 8,
        active: true,
        conditions: {
          user_conditions: {
            nivel_declarado: ['iniciante'],
            dias_desde_cadastro: { max: 30 }
          }
        },
        actions: {
          boost_score: 1.5,
          priority_boost: 0.2
        }
      },
      
      {
        name: 'Perda de Peso - Cardio + Nutrição',
        description: 'Focar em exercícios cardio e nutrição para meta de perda de peso',
        priority: 9,
        active: true,
        conditions: {
          user_conditions: {
            meta_principal: ['perder_peso']
          },
          content_conditions: {
            tipo: ['exercicio', 'nutricao'],
            foco: ['perda_peso']
          }
        },
        actions: {
          boost_score: 2.0,
          priority_boost: 0.3
        }
      },
      
      {
        name: 'Ganho de Massa - Musculação + Proteína',
        description: 'Priorizar musculação e nutrição proteica para ganho de massa',
        priority: 9,
        active: true,
        conditions: {
          user_conditions: {
            meta_principal: ['ganhar_massa'],
            atividades_preferidas: ['musculacao']
          },
          content_conditions: {
            tipo: ['exercicio', 'nutricao'],
            foco: ['ganho_massa']
          }
        },
        actions: {
          boost_score: 2.0,
          priority_boost: 0.3
        }
      },
      
      {
        name: 'Tempo Limitado - Conteúdo Curto',
        description: 'Priorizar conteúdo curto para usuários com pouco tempo',
        priority: 7,
        active: true,
        conditions: {
          user_conditions: {
            tempo_disponivel: ['pouco']
          },
          content_conditions: {
            duracao: ['curta']
          }
        },
        actions: {
          boost_score: 1.8,
          priority_boost: 0.25
        }
      },
      
      {
        name: 'Usuários Inativos - Conteúdo Motivacional',
        description: 'Conteúdo fácil e motivacional para reengajar usuários inativos',
        priority: 10,
        active: true,
        conditions: {
          behavioral_conditions: {
            ultimo_acesso_dias: 7
          },
          content_conditions: {
            dificuldade: ['iniciante'],
            duracao: ['curta']
          }
        },
        actions: {
          boost_score: 2.5,
          priority_boost: 0.4
        }
      },
      
      {
        name: 'Excluir Conteúdo Avançado para Iniciantes',
        description: 'Não mostrar conteúdo avançado para usuários iniciantes',
        priority: 10,
        active: true,
        conditions: {
          user_conditions: {
            nivel_declarado: ['iniciante']
          },
          content_conditions: {
            dificuldade: ['avancado']
          }
        },
        actions: {
          exclude: true
        }
      }
    ];
    
    for (const ruleData of defaultRules) {
      await this.createBusinessRule(ruleData);
    }
    
    console.log(`✅ Initialized ${defaultRules.length} default business rules`);
  }

  // MÉTODOS AUXILIARES

  private isCompatibleWithGoal(contentFocus: string, userGoal: string): boolean {
    const compatibility: Record<string, string[]> = {
      'perder_peso': ['perda_peso', 'bem_estar', 'energia'],
      'ganhar_massa': ['ganho_massa', 'resistencia'],
      'melhorar_condicionamento': ['resistencia', 'bem_estar', 'energia'],
      'bem_estar_geral': ['bem_estar', 'flexibilidade', 'energia'],
      'habitos_saudaveis': ['bem_estar', 'energia']
    };
    
    return compatibility[userGoal]?.includes(contentFocus) || false;
  }

  private isCompatibleWithTime(contentDuration: string, userTime: string): boolean {
    const compatibility: Record<string, string[]> = {
      'pouco': ['curta'],
      'medio': ['curta', 'media'],
      'muito': ['curta', 'media', 'longa']
    };
    
    return compatibility[userTime]?.includes(contentDuration) || false;
  }

  // MÉTODOS DE DADOS (Mock - implementar com banco real)

  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    // Mock data - implementar busca real no banco
    return {
      id: userId,
      meta_principal: 'perder_peso',
      atividades_preferidas: ['corrida', 'yoga'],
      nivel_declarado: 'iniciante',
      tempo_disponivel: 'medio',
      horario_preferido: 'manha',
      frequencia_desejada: 'diaria',
      motivacao_principal: 'saude',
      restricoes_alimentares: [],
      limitacoes_fisicas: [],
      equipamentos_disponiveis: ['nenhum'],
      desafios_completados: 5,
      tipos_mais_engajados: ['exercicio', 'nutricao'],
      horarios_mais_ativos: ['08:00', '19:00'],
      taxa_conclusao_geral: 0.75,
      plano_atual: 'Premium',
      dias_desde_cadastro: 15,
      ultimo_acesso: new Date().toISOString()
    };
  }

  private async getAvailableContent(): Promise<ContentTaxonomy[]> {
    // Mock data - implementar busca real no banco
    return [
      {
        id: 'challenge_1',
        title: 'Desafio Caminhada Matinal',
        description: 'Comece o dia com uma caminhada energizante de 15 minutos',
        tipo: 'exercicio',
        categoria: 'desafio',
        dificuldade: 'iniciante',
        foco: 'perda_peso',
        duracao: 'curta',
        calorias_queimadas: 80,
        equipamento_necessario: [],
        nivel_impacto: 'baixo',
        momento_ideal: 'manha',
        rating_medio: 4.5,
        total_completados: 1250,
        taxa_conclusao: 0.85,
        tags: ['caminhada', 'cardio', 'outdoor'],
        created_at: '2024-10-01T00:00:00Z',
        updated_at: '2024-10-15T00:00:00Z'
      },
      {
        id: 'article_1',
        title: 'Guia de Hidratação Diária',
        description: 'Aprenda a manter-se hidratado ao longo do dia',
        tipo: 'hidratacao',
        categoria: 'artigo',
        dificuldade: 'iniciante',
        foco: 'bem_estar',
        duracao: 'curta',
        rating_medio: 4.2,
        total_completados: 890,
        taxa_conclusao: 0.92,
        tags: ['agua', 'saude', 'habitos'],
        created_at: '2024-09-15T00:00:00Z',
        updated_at: '2024-10-10T00:00:00Z'
      }
    ];
  }

  private async getActiveBusinessRules(): Promise<BusinessRule[]> {
    // Mock - implementar busca real no banco
    return []; // Será populado pelo initializeDefaultRules
  }

  private async getFallbackRecommendations(limit: number): Promise<RecommendationResult[]> {
    // Recomendações genéricas em caso de erro
    return [
      {
        content_id: 'fallback_1',
        score: 0.5,
        reasoning: ['Recomendação padrão'],
        applied_rules: [],
        position: 1
      }
    ];
  }

  private async logRecommendations(userId: string, recommendations: RecommendationResult[], context: string): Promise<void> {
    console.log(`📊 Logging recommendations for user ${userId} in context ${context}:`, recommendations.length);
    // Implementar logging para análise posterior
  }

  private async saveBusinessRule(rule: BusinessRule): Promise<void> {
    console.log(`💾 Saving business rule: ${rule.name}`);
    // Implementar salvamento no banco
  }
}

export default RecommendationEngineService;
