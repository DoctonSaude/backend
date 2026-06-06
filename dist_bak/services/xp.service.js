"use strict";
/**
 * XP SERVICE
 * Gerencia a lógica de concessão e cálculo de Experience Points (XP)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const xp_economy_1 = require("../data/xp-economy");
/**
 * SERVIÇO PRINCIPAL DE XP
 */
class XPService {
    /**
     * Conceder XP por uma ação
     */
    awardXP(userId, actionId, context) {
        const action = xp_economy_1.XP_ACTIONS_BY_ID[actionId];
        if (!action) {
            return {
                success: false,
                xpEarned: 0,
                error: `Ação não encontrada: ${actionId}`
            };
        }
        // Calcular XP
        const finalXP = (0, xp_economy_1.calculateXP)(actionId, context);
        // Criar transação
        const transaction = {
            actionId,
            actionName: action.name,
            baseXP: action.baseXP,
            finalXP,
            multipliers: {
                streak: context?.streak,
                perfect: context?.isPerfect ? action.multipliers?.perfect : undefined,
                combo: context?.isCombo ? action.multipliers?.combo : undefined
            },
            timestamp: new Date(),
            context
        };
        console.log(`✅ XP concedido: ${finalXP} XP para ${userId} (${action.name})`);
        return {
            success: true,
            xpEarned: finalXP,
            transaction
        };
    }
    /**
     * Conceder XP em lote
     */
    awardBatchXP(userId, actions) {
        const transactions = [];
        const errors = [];
        let totalXP = 0;
        for (const { actionId, context } of actions) {
            const result = this.awardXP(userId, actionId, context);
            if (result.success && result.transaction) {
                transactions.push(result.transaction);
                totalXP += result.xpEarned;
            }
            else if (result.error) {
                errors.push(result.error);
            }
        }
        return {
            success: errors.length === 0,
            totalXP,
            transactions,
            errors
        };
    }
    /**
     * Verificar se usuário pode realizar ação
     */
    canUserPerformAction(actionId, userContext) {
        const action = xp_economy_1.XP_ACTIONS_BY_ID[actionId];
        if (!action) {
            return {
                can: false,
                reason: 'Ação não encontrada'
            };
        }
        return (0, xp_economy_1.canPerformAction)(action, userContext);
    }
    /**
     * Calcular XP estimado para uma ação
     */
    estimateXP(actionId, context) {
        return (0, xp_economy_1.calculateXP)(actionId, context);
    }
    /**
     * Obter lista de ações disponíveis para o usuário
     */
    getAvailableActions(userContext) {
        const actions = Object.values(xp_economy_1.XP_ACTIONS_BY_ID);
        return actions.filter(action => {
            const check = (0, xp_economy_1.canPerformAction)(action, userContext);
            return check.can;
        });
    }
    /**
     * Obter ações por categoria
     */
    getActionsByCategory(category) {
        return Object.values(xp_economy_1.XP_ACTIONS_BY_ID).filter(action => action.category === category);
    }
    /**
     * Calcular bônus de streak
     */
    calculateStreakBonus(streak, baseXP, multiplier = 1.1) {
        const streakMultiplier = Math.pow(multiplier, Math.min(streak, 30));
        return Math.floor(baseXP * streakMultiplier);
    }
    /**
     * Eventos automáticos de XP
     */
    // Quando usuário completa um desafio
    onChallengeComplete(userId, challengeType, context) {
        const actionMap = {
            DAILY: 'complete-daily-challenge',
            WEEKLY: 'complete-weekly-challenge',
            MONTHLY: 'complete-monthly-challenge',
            SPECIAL: 'complete-special-challenge'
        };
        const actionId = actionMap[challengeType];
        return this.awardXP(userId, actionId, context);
    }
    // Quando usuário faz check-in
    onDailyCheckIn(userId, streak) {
        return this.awardXP(userId, 'daily-checkin', { streak });
    }
    // Quando usuário registra treino
    onWorkoutLogged(userId, durationMinutes, streak) {
        return this.awardXP(userId, 'log-workout', {
            duration: durationMinutes,
            streak
        });
    }
    // Quando usuário registra refeição
    onMealLogged(userId) {
        return this.awardXP(userId, 'log-meal');
    }
    // Quando usuário registra água
    onWaterLogged(userId) {
        return this.awardXP(userId, 'log-water');
    }
    // Quando usuário registra sono
    onSleepLogged(userId, hours) {
        const isPerfect = hours >= 7 && hours <= 9;
        return this.awardXP(userId, 'log-sleep', { isPerfect });
    }
    // Quando usuário agenda consulta
    onAppointmentBooked(userId) {
        return this.awardXP(userId, 'book-appointment');
    }
    // Quando usuário completa consulta
    onAppointmentCompleted(userId) {
        return this.awardXP(userId, 'complete-appointment');
    }
    // Quando usuário atualiza prontuário
    onMedicalRecordsUpdated(userId) {
        return this.awardXP(userId, 'update-medical-records');
    }
    // Quando usuário atinge um streak
    onStreakAchieved(userId, days) {
        const streakMap = {
            7: 'streak-7-days',
            14: 'streak-14-days',
            30: 'streak-30-days',
            60: 'streak-60-days',
            100: 'streak-100-days'
        };
        const actionId = streakMap[days];
        if (actionId) {
            return this.awardXP(userId, actionId);
        }
        return { success: false, xpEarned: 0, error: 'Streak milestone not found' };
    }
    // Quando usuário convida amigo
    onFriendInvited(userId) {
        return this.awardXP(userId, 'invite-friend');
    }
    // Quando amigo se cadastra
    onFriendJoins(userId) {
        return this.awardXP(userId, 'friend-joins');
    }
    // Quando usuário avalia profissional
    onProfessionalRated(userId, hasComment) {
        const actionId = hasComment ? 'write-review' : 'rate-professional';
        return this.awardXP(userId, actionId);
    }
    /**
     * Relatório de XP do usuário
     */
    getUserXPReport(transactions) {
        const totalXP = transactions.reduce((sum, t) => sum + t.finalXP, 0);
        const byCategory = {};
        const byDay = {};
        const actionCounts = {};
        transactions.forEach(t => {
            const action = xp_economy_1.XP_ACTIONS_BY_ID[t.actionId];
            if (action) {
                // Por categoria
                byCategory[action.category] = (byCategory[action.category] || 0) + t.finalXP;
            }
            // Por dia
            const day = t.timestamp.toISOString().split('T')[0];
            byDay[day] = (byDay[day] || 0) + t.finalXP;
            // Contar ações
            if (!actionCounts[t.actionName]) {
                actionCounts[t.actionName] = { xp: 0, count: 0 };
            }
            actionCounts[t.actionName].xp += t.finalXP;
            actionCounts[t.actionName].count += 1;
        });
        const topActions = Object.entries(actionCounts)
            .map(([actionName, data]) => ({ actionName, ...data }))
            .sort((a, b) => b.xp - a.xp)
            .slice(0, 10);
        return {
            totalXP,
            byCategory,
            byDay,
            topActions
        };
    }
}
exports.default = new XPService();
//# sourceMappingURL=xp.service.js.map