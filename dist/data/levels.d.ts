/**
 * SISTEMA DE NÍVEIS - JORNADA DO HERÓI
 * Curva logarítmica de progressão
 * 50 níveis com títulos épicos
 */
export interface Level {
    level: number;
    title: string;
    xpRequired: number;
    xpToNext: number;
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'LEGEND';
    rewards?: {
        healthPoints?: number;
        badge?: string;
        discount?: number;
        specialReward?: string;
    };
}
export declare const LEVELS: Level[];
/**
 * Utilitários para trabalhar com níveis
 */
export declare function getLevelByXP(xp: number): Level;
export declare function getProgressToNextLevel(xp: number): {
    current: number;
    required: number;
    percentage: number;
};
export declare function getTierColor(tier: Level['tier']): string;
export default LEVELS;
//# sourceMappingURL=levels.d.ts.map