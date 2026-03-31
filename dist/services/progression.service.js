"use strict";
/**
 * PROGRESSION SERVICE
 * Gerencia níveis, progressão e recompensas de nível
 */
Object.defineProperty(exports, "__esModule", { value: true });
const levels_1 = require("../data/levels");
const badges_categorized_1 = require("../data/badges-categorized");
/**
 * SERVIÇO DE PROGRESSÃO
 */
class ProgressionService {
    /**
     * Obter snapshot completo de progressão do usuário
     */
    getProgressionSnapshot(totalXP) {
        const currentLevel = (0, levels_1.getLevelByXP)(totalXP);
        const progressToNext = (0, levels_1.getProgressToNextLevel)(totalXP);
        // Encontrar próximo milestone importante
        const nextMilestone = this.getNextMilestone(currentLevel.level);
        return {
            totalXP,
            currentLevel,
            progressToNext,
            tier: currentLevel.tier,
            nextMilestone
        };
    }
    /**
     * Processar ganho de XP e verificar level up
     */
    processXPGain(userId, currentXP, xpGained) {
        const previousLevel = (0, levels_1.getLevelByXP)(currentXP).level;
        const newXP = currentXP + xpGained;
        const newLevel = (0, levels_1.getLevelByXP)(newXP).level;
        const levelUpEvents = [];
        // Verificar se houve level up (pode ser múltiplos níveis)
        if (newLevel > previousLevel) {
            for (let level = previousLevel + 1; level <= newLevel; level++) {
                const levelData = levels_1.LEVELS[level - 1]; // Array começa em 0
                const event = {
                    userId,
                    previousLevel: level - 1,
                    newLevel: level,
                    levelData,
                    rewards: levelData.rewards || {},
                    timestamp: new Date()
                };
                levelUpEvents.push(event);
                console.log(`🎉 LEVEL UP! Usuário ${userId}: Nível ${level - 1} → ${level} (${levelData.title})`);
            }
        }
        return {
            newXP,
            levelUp: levelUpEvents.length > 0,
            levelUpEvents,
            previousLevel,
            newLevel
        };
    }
    /**
     * Verificar conquista de badges por progresso
     */
    checkBadgeUnlocks(userProgress) {
        const newBadges = [];
        // Verificar badges de nível
        const levelBadges = [
            { level: 10, badgeId: 'bronze-warrior' },
            { level: 20, badgeId: 'silver-warrior' },
            { level: 30, badgeId: 'gold-warrior' },
            { level: 40, badgeId: 'platinum-warrior' },
            { level: 45, badgeId: 'diamond-warrior' },
            { level: 50, badgeId: 'absolute-mastery' }
        ];
        for (const { level, badgeId } of levelBadges) {
            if (userProgress.level >= level && !userProgress.badgesEarned.includes(badgeId)) {
                newBadges.push(badgeId);
            }
        }
        // Verificar badges de desafios completados
        const challengeBadges = [
            { count: 10, badgeId: 'apprentice' },
            { count: 50, badgeId: 'journeyman' },
            { count: 100, badgeId: 'expert' },
            { count: 250, badgeId: 'master' },
            { count: 500, badgeId: 'grandmaster' }
        ];
        for (const { count, badgeId } of challengeBadges) {
            if (userProgress.challengesCompleted >= count && !userProgress.badgesEarned.includes(badgeId)) {
                newBadges.push(badgeId);
            }
        }
        // Verificar badges de streak
        const streakBadges = [
            { streak: 7, badgeId: 'week-warrior' },
            { streak: 14, badgeId: 'fortnight-fighter' },
            { streak: 30, badgeId: 'month-master' },
            { streak: 100, badgeId: 'eternal-flame' },
            { streak: 365, badgeId: 'immortal-spirit' }
        ];
        for (const { streak, badgeId } of streakBadges) {
            if (userProgress.streak >= streak && !userProgress.badgesEarned.includes(badgeId)) {
                newBadges.push(badgeId);
            }
        }
        // Verificar badges de colecionador
        const badgeCount = userProgress.badgesEarned.length;
        if (badgeCount >= 10 && !userProgress.badgesEarned.includes('badge-collector')) {
            newBadges.push('badge-collector');
        }
        if (badgeCount >= 25 && !userProgress.badgesEarned.includes('badge-hunter')) {
            newBadges.push('badge-hunter');
        }
        return newBadges.filter(id => !userProgress.badgesEarned.includes(id));
    }
    /**
     * Aplicar recompensas de level up
     */
    applyLevelRewards(levelUpEvent) {
        const rewards = levelUpEvent.rewards;
        let xpFromBadge = 0;
        // Se ganhou badge, conceder XP do badge
        if (rewards.badge) {
            const badge = badges_categorized_1.BADGES_BY_ID[rewards.badge];
            if (badge) {
                xpFromBadge = badge.xpReward;
                console.log(`🏅 Badge desbloqueado: ${badge.name} (+${badge.xpReward} XP)`);
            }
        }
        return {
            healthPoints: rewards.healthPoints || 0,
            badge: rewards.badge,
            discount: rewards.discount || 0,
            specialReward: rewards.specialReward,
            xpFromBadge
        };
    }
    /**
     * Obter próximo milestone importante
     */
    getNextMilestone(currentLevel) {
        // Milestones importantes: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50
        const milestones = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
        const nextMilestone = milestones.find(m => m > currentLevel) || 50;
        const milestoneData = levels_1.LEVELS[nextMilestone - 1];
        const currentLevelData = levels_1.LEVELS[currentLevel - 1];
        const xpRemaining = milestoneData.xpRequired - currentLevelData.xpRequired;
        return {
            level: nextMilestone,
            title: milestoneData.title,
            xpRequired: milestoneData.xpRequired,
            xpRemaining
        };
    }
    /**
     * Calcular tempo estimado para próximo nível
     */
    estimateTimeToNextLevel(currentXP, averageDailyXP) {
        const progress = (0, levels_1.getProgressToNextLevel)(currentXP);
        const xpRemaining = progress.required - progress.current;
        const days = Math.ceil(xpRemaining / averageDailyXP);
        const currentLevel = (0, levels_1.getLevelByXP)(currentXP).level;
        return {
            days,
            level: currentLevel + 1,
            xpRemaining
        };
    }
    /**
     * Obter ranking de níveis (leaderboard)
     */
    getLevelLeaderboard(users) {
        return users
            .map(user => {
            const level = (0, levels_1.getLevelByXP)(user.xp);
            return {
                userId: user.id,
                userName: user.name,
                level: level.level,
                levelTitle: level.title,
                xp: user.xp,
                tier: level.tier
            };
        })
            .sort((a, b) => b.xp - a.xp)
            .map((user, index) => ({
            rank: index + 1,
            ...user
        }));
    }
    /**
     * Obter estatísticas de progressão do usuário
     */
    getUserProgressionStats(totalXP, startDate) {
        const currentLevel = (0, levels_1.getLevelByXP)(totalXP).level;
        const maxXP = levels_1.LEVELS[49].xpRequired; // Nível 50
        const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const averageXPPerDay = daysSinceStart > 0 ? totalXP / daysSinceStart : 0;
        const xpToMax = maxXP - totalXP;
        const estimatedDaysTo50 = averageXPPerDay > 0 ? Math.ceil(xpToMax / averageXPPerDay) : 0;
        const percentageToMax = (totalXP / maxXP) * 100;
        return {
            currentLevel,
            xpEarned: totalXP,
            daysSinceStart,
            averageXPPerDay: Math.round(averageXPPerDay),
            estimatedDaysTo50,
            percentageToMax: Math.round(percentageToMax * 100) / 100
        };
    }
    /**
     * Obter todos os níveis com informações
     */
    getAllLevels() {
        return levels_1.LEVELS;
    }
    /**
     * Obter informações de um nível específico
     */
    getLevelInfo(level) {
        if (level < 1 || level > 50)
            return null;
        return levels_1.LEVELS[level - 1];
    }
    /**
     * Calcular total de recompensas até um nível
     */
    calculateTotalRewards(upToLevel) {
        let totalHealthPoints = 0;
        let totalBadges = 0;
        let maxDiscount = 0;
        const specialRewards = [];
        for (let i = 0; i < Math.min(upToLevel, 50); i++) {
            const level = levels_1.LEVELS[i];
            if (level.rewards) {
                totalHealthPoints += level.rewards.healthPoints || 0;
                if (level.rewards.badge)
                    totalBadges++;
                if (level.rewards.discount && level.rewards.discount > maxDiscount) {
                    maxDiscount = level.rewards.discount;
                }
                if (level.rewards.specialReward) {
                    specialRewards.push(level.rewards.specialReward);
                }
            }
        }
        return {
            totalHealthPoints,
            totalBadges,
            maxDiscount,
            specialRewards
        };
    }
    /**
     * Simular progressão (para testes/balanceamento)
     */
    simulateProgression(dailyXP, days) {
        const timeline = [];
        let currentXP = 0;
        const startLevel = 1;
        for (let day = 1; day <= days; day++) {
            currentXP += dailyXP;
            const level = (0, levels_1.getLevelByXP)(currentXP).level;
            if (day % 7 === 0 || day === 1 || day === days) {
                timeline.push({ day, xp: currentXP, level });
            }
        }
        const finalLevel = (0, levels_1.getLevelByXP)(currentXP).level;
        return {
            finalLevel,
            finalXP: currentXP,
            levelsGained: finalLevel - startLevel,
            timeline
        };
    }
}
exports.default = new ProgressionService();
//# sourceMappingURL=progression.service.js.map