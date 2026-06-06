/**
 * PROGRESSION SERVICE
 * Gerencia níveis, progressão e recompensas de nível
 */
import { type Level } from '../data/levels';
export interface LevelUpEvent {
    userId: string;
    previousLevel: number;
    newLevel: number;
    levelData: Level;
    rewards: {
        healthPoints?: number;
        badge?: string;
        discount?: number;
        specialReward?: string;
    };
    timestamp: Date;
}
export interface ProgressionSnapshot {
    totalXP: number;
    currentLevel: Level;
    progressToNext: {
        current: number;
        required: number;
        percentage: number;
    };
    tier: Level['tier'];
    nextMilestone: {
        level: number;
        title: string;
        xpRequired: number;
        xpRemaining: number;
    };
}
/**
 * SERVIÇO DE PROGRESSÃO
 */
declare class ProgressionService {
    /**
     * Obter snapshot completo de progressão do usuário
     */
    getProgressionSnapshot(totalXP: number): ProgressionSnapshot;
    /**
     * Processar ganho de XP e verificar level up
     */
    processXPGain(userId: string, currentXP: number, xpGained: number): {
        newXP: number;
        levelUp: boolean;
        levelUpEvents: LevelUpEvent[];
        previousLevel: number;
        newLevel: number;
    };
    /**
     * Verificar conquista de badges por progresso
     */
    checkBadgeUnlocks(userProgress: {
        level: number;
        totalXP: number;
        streak: number;
        challengesCompleted: number;
        badgesEarned: string[];
    }): string[];
    /**
     * Aplicar recompensas de level up
     */
    applyLevelRewards(levelUpEvent: LevelUpEvent): {
        healthPoints: number;
        badge?: string;
        discount: number;
        specialReward?: string;
        xpFromBadge: number;
    };
    /**
     * Obter próximo milestone importante
     */
    getNextMilestone(currentLevel: number): {
        level: number;
        title: string;
        xpRequired: number;
        xpRemaining: number;
    };
    /**
     * Calcular tempo estimado para próximo nível
     */
    estimateTimeToNextLevel(currentXP: number, averageDailyXP: number): {
        days: number;
        level: number;
        xpRemaining: number;
    };
    /**
     * Obter ranking de níveis (leaderboard)
     */
    getLevelLeaderboard(users: Array<{
        id: string;
        name: string;
        xp: number;
    }>): Array<{
        rank: number;
        userId: string;
        userName: string;
        level: number;
        levelTitle: string;
        xp: number;
        tier: Level['tier'];
    }>;
    /**
     * Obter estatísticas de progressão do usuário
     */
    getUserProgressionStats(totalXP: number, startDate: Date): {
        currentLevel: number;
        xpEarned: number;
        daysSinceStart: number;
        averageXPPerDay: number;
        estimatedDaysTo50: number;
        percentageToMax: number;
    };
    /**
     * Obter todos os níveis com informações
     */
    getAllLevels(): Level[];
    /**
     * Obter informações de um nível específico
     */
    getLevelInfo(level: number): Level | null;
    /**
     * Calcular total de recompensas até um nível
     */
    calculateTotalRewards(upToLevel: number): {
        totalHealthPoints: number;
        totalBadges: number;
        maxDiscount: number;
        specialRewards: string[];
    };
    /**
     * Simular progressão (para testes/balanceamento)
     */
    simulateProgression(dailyXP: number, days: number): {
        finalLevel: number;
        finalXP: number;
        levelsGained: number;
        timeline: Array<{
            day: number;
            xp: number;
            level: number;
        }>;
    };
}
declare const _default: ProgressionService;
export default _default;
//# sourceMappingURL=progression.service.d.ts.map