/**
 * XP SERVICE
 * Gerencia a lógica de concessão e cálculo de Experience Points (XP)
 */

import { calculateXP, XP_ACTIONS_BY_ID, canPerformAction, type XPAction } from '../data/xp-economy';

export interface XPTransaction {
  actionId: string;
  actionName: string;
  baseXP: number;
  finalXP: number;
  multipliers: {
    streak?: number;
    perfect?: number;
    combo?: number;
  };
  timestamp: Date;
  context?: any;
}

export interface XPLog {
  userId: string;
  transactions: XPTransaction[];
  totalXPEarned: number;
  lastUpdated: Date;
}

/**
 * SERVIÇO PRINCIPAL DE XP
 */
class XPService {
  /**
   * Conceder XP por uma ação
   */
  awardXP(
    userId: string,
    actionId: string,
    context?: {
      streak?: number;
      isPerfect?: boolean;
      isCombo?: boolean;
      duration?: number;
    }
  ): { success: boolean; xpEarned: number; transaction?: XPTransaction; error?: string } {
    const action = XP_ACTIONS_BY_ID[actionId];

    if (!action) {
      return {
        success: false,
        xpEarned: 0,
        error: `Ação não encontrada: ${actionId}`
      };
    }

    // Calcular XP
    const finalXP = calculateXP(actionId, context);

    // Criar transação
    const transaction: XPTransaction = {
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
  awardBatchXP(
    userId: string,
    actions: Array<{
      actionId: string;
      context?: any;
    }>
  ): {
    success: boolean;
    totalXP: number;
    transactions: XPTransaction[];
    errors: string[];
  } {
    const transactions: XPTransaction[] = [];
    const errors: string[] = [];
    let totalXP = 0;

    for (const { actionId, context } of actions) {
      const result = this.awardXP(userId, actionId, context);
      
      if (result.success && result.transaction) {
        transactions.push(result.transaction);
        totalXP += result.xpEarned;
      } else if (result.error) {
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
  canUserPerformAction(
    actionId: string,
    userContext: {
      level: number;
      streak: number;
      badges: string[];
      actionsToday?: Record<string, number>;
    }
  ): { can: boolean; reason?: string } {
    const action = XP_ACTIONS_BY_ID[actionId];
    
    if (!action) {
      return {
        can: false,
        reason: 'Ação não encontrada'
      };
    }

    return canPerformAction(action, userContext);
  }

  /**
   * Calcular XP estimado para uma ação
   */
  estimateXP(
    actionId: string,
    context?: {
      streak?: number;
      isPerfect?: boolean;
      isCombo?: boolean;
      duration?: number;
    }
  ): number {
    return calculateXP(actionId, context);
  }

  /**
   * Obter lista de ações disponíveis para o usuário
   */
  getAvailableActions(
    userContext: {
      level: number;
      streak: number;
      badges: string[];
      actionsToday?: Record<string, number>;
    }
  ): XPAction[] {
    const actions = Object.values(XP_ACTIONS_BY_ID);
    
    return actions.filter(action => {
      const check = canPerformAction(action, userContext);
      return check.can;
    });
  }

  /**
   * Obter ações por categoria
   */
  getActionsByCategory(category: XPAction['category']): XPAction[] {
    return Object.values(XP_ACTIONS_BY_ID).filter(
      action => action.category === category
    );
  }

  /**
   * Calcular bônus de streak
   */
  calculateStreakBonus(streak: number, baseXP: number, multiplier: number = 1.1): number {
    const streakMultiplier = Math.pow(multiplier, Math.min(streak, 30));
    return Math.floor(baseXP * streakMultiplier);
  }

  /**
   * Eventos automáticos de XP
   */
  
  // Quando usuário completa um desafio
  onChallengeComplete(
    userId: string,
    challengeType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL',
    context?: {
      isPerfect?: boolean;
      streak?: number;
    }
  ) {
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
  onDailyCheckIn(userId: string, streak: number) {
    return this.awardXP(userId, 'daily-checkin', { streak });
  }

  // Quando usuário registra treino
  onWorkoutLogged(userId: string, durationMinutes: number, streak?: number) {
    return this.awardXP(userId, 'log-workout', {
      duration: durationMinutes,
      streak
    });
  }

  // Quando usuário registra refeição
  onMealLogged(userId: string) {
    return this.awardXP(userId, 'log-meal');
  }

  // Quando usuário registra água
  onWaterLogged(userId: string) {
    return this.awardXP(userId, 'log-water');
  }

  // Quando usuário registra sono
  onSleepLogged(userId: string, hours: number) {
    const isPerfect = hours >= 7 && hours <= 9;
    return this.awardXP(userId, 'log-sleep', { isPerfect });
  }

  // Quando usuário agenda consulta
  onAppointmentBooked(userId: string) {
    return this.awardXP(userId, 'book-appointment');
  }

  // Quando usuário completa consulta
  onAppointmentCompleted(userId: string) {
    return this.awardXP(userId, 'complete-appointment');
  }

  // Quando usuário atualiza prontuário
  onMedicalRecordsUpdated(userId: string) {
    return this.awardXP(userId, 'update-medical-records');
  }

  // Quando usuário atinge um streak
  onStreakAchieved(userId: string, days: number) {
    const streakMap: Record<number, string> = {
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
  onFriendInvited(userId: string) {
    return this.awardXP(userId, 'invite-friend');
  }

  // Quando amigo se cadastra
  onFriendJoins(userId: string) {
    return this.awardXP(userId, 'friend-joins');
  }

  // Quando usuário avalia profissional
  onProfessionalRated(userId: string, hasComment: boolean) {
    const actionId = hasComment ? 'write-review' : 'rate-professional';
    return this.awardXP(userId, actionId);
  }

  /**
   * Relatório de XP do usuário
   */
  getUserXPReport(transactions: XPTransaction[]): {
    totalXP: number;
    byCategory: Record<string, number>;
    byDay: Record<string, number>;
    topActions: Array<{ actionName: string; xp: number; count: number }>;
  } {
    const totalXP = transactions.reduce((sum, t) => sum + t.finalXP, 0);
    
    const byCategory: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const actionCounts: Record<string, { xp: number; count: number }> = {};

    transactions.forEach(t => {
      const action = XP_ACTIONS_BY_ID[t.actionId];
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

export default new XPService();
