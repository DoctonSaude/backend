/**
 * SISTEMA DE BADGES CATEGORIZADO
 * Organizado em 4 categorias principais da Jornada do Herói
 */
export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
    category: 'CONSISTENCY' | 'EXPLORATION' | 'SOCIAL' | 'MASTERY';
    isSecret: boolean;
    requirement: string;
    xpReward: number;
    order: number;
}
export declare const CONSISTENCY_BADGES: Badge[];
export declare const EXPLORATION_BADGES: Badge[];
export declare const SOCIAL_BADGES: Badge[];
export declare const MASTERY_BADGES: Badge[];
export declare const ALL_BADGES: Badge[];
/**
 * Índice por ID
 */
export declare const BADGES_BY_ID: Record<string, Badge>;
/**
 * Badges por categoria
 */
export declare const BADGES_BY_CATEGORY: {
    CONSISTENCY: Badge[];
    EXPLORATION: Badge[];
    SOCIAL: Badge[];
    MASTERY: Badge[];
};
/**
 * Badges por raridade
 */
export declare const BADGES_BY_RARITY: {
    COMMON: Badge[];
    RARE: Badge[];
    EPIC: Badge[];
    LEGENDARY: Badge[];
    MYTHIC: Badge[];
};
/**
 * Badges secretos
 */
export declare const SECRET_BADGES: Badge[];
/**
 * Cores por raridade
 */
export declare const RARITY_COLORS: {
    COMMON: string;
    RARE: string;
    EPIC: string;
    LEGENDARY: string;
    MYTHIC: string;
};
export default ALL_BADGES;
//# sourceMappingURL=badges-categorized.d.ts.map