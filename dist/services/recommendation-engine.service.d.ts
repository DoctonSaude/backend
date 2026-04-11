/**
 * PROJETO CÉREBRO - FASE 1: MOTOR DE REGRAS
 * Sistema de recomendação baseado em regras SE-ENTÃO
 * "Automação da empatia" - entregando valor imediato
 */
export interface ContentTaxonomy {
    id: string;
    title: string;
    description: string;
    tipo: 'nutricao' | 'exercicio' | 'mindfulness' | 'sono' | 'hidratacao' | 'habitos';
    categoria: 'desafio' | 'artigo' | 'video' | 'receita' | 'dica';
    dificuldade: 'iniciante' | 'intermediario' | 'avancado';
    foco: 'perda_peso' | 'ganho_massa' | 'resistencia' | 'flexibilidade' | 'bem_estar' | 'energia';
    duracao: 'curta' | 'media' | 'longa';
    calorias_queimadas?: number;
    equipamento_necessario?: string[];
    nivel_impacto?: 'baixo' | 'medio' | 'alto';
    momento_ideal?: 'manha' | 'tarde' | 'noite' | 'qualquer';
    rating_medio: number;
    total_completados: number;
    taxa_conclusao: number;
    tags: string[];
    created_at: string;
    updated_at: string;
}
export interface UserProfile {
    id: string;
    meta_principal: 'perder_peso' | 'ganhar_massa' | 'melhorar_condicionamento' | 'bem_estar_geral' | 'habitos_saudaveis';
    atividades_preferidas: string[];
    nivel_declarado: 'iniciante' | 'intermediario' | 'avancado';
    tempo_disponivel: 'pouco' | 'medio' | 'muito';
    horario_preferido?: 'manha' | 'tarde' | 'noite';
    frequencia_desejada?: 'diaria' | 'dias_alternados' | 'fins_semana';
    motivacao_principal?: 'saude' | 'estetica' | 'performance' | 'social';
    restricoes_alimentares?: string[];
    limitacoes_fisicas?: string[];
    equipamentos_disponiveis?: string[];
    desafios_completados: number;
    tipos_mais_engajados: string[];
    horarios_mais_ativos: string[];
    taxa_conclusao_geral: number;
    plano_atual: string;
    dias_desde_cadastro: number;
    ultimo_acesso: string;
}
export interface BusinessRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    active: boolean;
    conditions: {
        user_conditions?: {
            meta_principal?: string[];
            atividades_preferidas?: string[];
            nivel_declarado?: string[];
            tempo_disponivel?: string[];
            dias_desde_cadastro?: {
                min?: number;
                max?: number;
            };
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
    actions: {
        boost_score?: number;
        priority_boost?: number;
        exclude?: boolean;
        tag_required?: string[];
        max_recommendations?: number;
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
export declare class RecommendationEngineService {
    /**
     * FASE 1: Motor de Regras Principal
     * Gera recomendações baseadas em regras de negócio
     */
    generateRecommendations(userId: string, context?: 'home' | 'post_challenge' | 'discover', limit?: number): Promise<RecommendationResult[]>;
    /**
     * Aplica regras de negócio para calcular scores de relevância
     */
    private applyBusinessRules;
    /**
     * Verifica se uma regra se aplica ao usuário e conteúdo
     */
    private ruleMatches;
    /**
     * Calcula score base baseado na compatibilidade usuário-conteúdo
     */
    private calculateBaseScore;
    /**
     * Ordena por score e aplica diversificação
     */
    private rankAndDiversify;
    /**
     * Aplica diversificação para evitar monotonia
     */
    private applyDiversification;
    /**
     * Cria e gerencia regras de negócio
     */
    createBusinessRule(ruleData: Omit<BusinessRule, 'id' | 'created_at' | 'updated_at'>): Promise<BusinessRule>;
    /**
     * Inicializa regras padrão do sistema
     */
    initializeDefaultRules(): Promise<void>;
    private isCompatibleWithGoal;
    private isCompatibleWithTime;
    private getUserProfile;
    private getAvailableContent;
    private getActiveBusinessRules;
    private getFallbackRecommendations;
    private logRecommendations;
    private saveBusinessRule;
}
export default RecommendationEngineService;
//# sourceMappingURL=recommendation-engine.service.d.ts.map