/**
 * ECONOMIA DE XP - CATÁLOGO DE AÇÕES
 * Define todas as ações que concedem Experience Points (XP)
 *
 * ✅ ALINHADO COM DIRETRIZ JORNADA DO HERÓI V1
 *
 * PRINCÍPIOS-CHAVE:
 * 1. Valorizar Consistência sobre Intensidade
 * 2. Recompensar Esforço Real em saúde
 * 3. Incentivar Engajamento Holístico
 *
 * Balanceado para criar progressão significativa e sustentável
 */
export interface XPAction {
    id: string;
    name: string;
    description: string;
    baseXP: number;
    category: 'CORE' | 'SOCIAL' | 'CONSISTENCY' | 'EXPLORATION' | 'MASTERY';
    frequency: 'UNLIMITED' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME';
    conditions?: {
        minLevel?: number;
        requiresStreak?: number;
        requiresBadge?: string;
    };
    multipliers?: {
        streak?: number;
        combo?: number;
        perfect?: number;
    };
}
/**
 * CATÁLOGO COMPLETO DE AÇÕES
 * Organizado por categoria para facilitar balance
 */
export declare const CORE_ACTIONS: XPAction[];
export declare const CONSISTENCY_ACTIONS: XPAction[];
export declare const SOCIAL_ACTIONS: XPAction[];
export declare const EXPLORATION_ACTIONS: XPAction[];
export declare const MASTERY_ACTIONS: XPAction[];
export declare const ALL_XP_ACTIONS: XPAction[];
/**
 * Índice rápido por ID
 */
export declare const XP_ACTIONS_BY_ID: Record<string, XPAction>;
/**
 * CÁLCULO DE XP COM MULTIPLICADORES
 */
export declare function calculateXP(actionId: string, context?: {
    streak?: number;
    isPerfect?: boolean;
    isCombo?: boolean;
    duration?: number;
}): number;
/**
 * XP ESTIMADO POR PERÍODO
 * Para ajudar no balanceamento
 */
export declare const ESTIMATED_XP_PER_PERIOD: {
    casual_user_daily: number;
    active_user_daily: number;
    hardcore_user_daily: number;
    casual_user_monthly: number;
    active_user_monthly: number;
    hardcore_user_monthly: number;
};
/**
 * VALIDAÇÃO DE AÇÃO
 * Verifica se usuário pode realizar a ação
 */
export declare function canPerformAction(action: XPAction, userContext: {
    level: number;
    streak: number;
    badges: string[];
    actionsToday?: Record<string, number>;
}): {
    can: boolean;
    reason?: string;
};
export default ALL_XP_ACTIONS;
//# sourceMappingURL=xp-economy.d.ts.map