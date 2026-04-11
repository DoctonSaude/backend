/**
 * XP SERVICE
 * Gerencia a lógica de concessão e cálculo de Experience Points (XP)
 */
import { type XPAction } from '../data/xp-economy';
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
declare class XPService {
    /**
     * Conceder XP por uma ação
     */
    awardXP(userId: string, actionId: string, context?: {
        streak?: number;
        isPerfect?: boolean;
        isCombo?: boolean;
        duration?: number;
    }): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    /**
     * Conceder XP em lote
     */
    awardBatchXP(userId: string, actions: Array<{
        actionId: string;
        context?: any;
    }>): {
        success: boolean;
        totalXP: number;
        transactions: XPTransaction[];
        errors: string[];
    };
    /**
     * Verificar se usuário pode realizar ação
     */
    canUserPerformAction(actionId: string, userContext: {
        level: number;
        streak: number;
        badges: string[];
        actionsToday?: Record<string, number>;
    }): {
        can: boolean;
        reason?: string;
    };
    /**
     * Calcular XP estimado para uma ação
     */
    estimateXP(actionId: string, context?: {
        streak?: number;
        isPerfect?: boolean;
        isCombo?: boolean;
        duration?: number;
    }): number;
    /**
     * Obter lista de ações disponíveis para o usuário
     */
    getAvailableActions(userContext: {
        level: number;
        streak: number;
        badges: string[];
        actionsToday?: Record<string, number>;
    }): XPAction[];
    /**
     * Obter ações por categoria
     */
    getActionsByCategory(category: XPAction['category']): XPAction[];
    /**
     * Calcular bônus de streak
     */
    calculateStreakBonus(streak: number, baseXP: number, multiplier?: number): number;
    /**
     * Eventos automáticos de XP
     */
    onChallengeComplete(userId: string, challengeType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL', context?: {
        isPerfect?: boolean;
        streak?: number;
    }): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onDailyCheckIn(userId: string, streak: number): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onWorkoutLogged(userId: string, durationMinutes: number, streak?: number): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onMealLogged(userId: string): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onWaterLogged(userId: string): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onSleepLogged(userId: string, hours: number): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onAppointmentBooked(userId: string): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onAppointmentCompleted(userId: string): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onMedicalRecordsUpdated(userId: string): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onStreakAchieved(userId: string, days: number): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onFriendInvited(userId: string): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onFriendJoins(userId: string): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    onProfessionalRated(userId: string, hasComment: boolean): {
        success: boolean;
        xpEarned: number;
        transaction?: XPTransaction;
        error?: string;
    };
    /**
     * Relatório de XP do usuário
     */
    getUserXPReport(transactions: XPTransaction[]): {
        totalXP: number;
        byCategory: Record<string, number>;
        byDay: Record<string, number>;
        topActions: Array<{
            actionName: string;
            xp: number;
            count: number;
        }>;
    };
}
declare const _default: XPService;
export default _default;
//# sourceMappingURL=xp.service.d.ts.map