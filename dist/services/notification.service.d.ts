import webpush, { PushSubscription } from 'web-push';
/**
 * Salvar subscription de um usuário
 */
export declare const saveSubscription: (userId: string, subscription: PushSubscription) => {
    success: boolean;
};
/**
 * Remover subscription de um usuário
 */
export declare const removeSubscription: (userId: string) => {
    success: boolean;
};
/**
 * Obter subscription de um usuário
 */
export declare const getSubscription: (userId: string) => webpush.PushSubscription;
/**
 * Enviar notificação push para um usuário específico
 */
export declare const sendPushNotification: (userId: string, payload: any) => Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: any;
}>;
/**
 * Enviar notificação para múltiplos usuários
 */
export declare const sendBulkPushNotifications: (userIds: string[], payload: any) => Promise<{
    successful: number;
    failed: number;
    total: number;
}>;
/**
 * Notificação de desafio em destaque (diária)
 */
export declare const notifyFeaturedChallenge: (userId: string, challenge: any) => Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: any;
}>;
/**
 * Notificação de lembrete de desafio ativo
 */
export declare const notifyActiveChallenge: (userId: string, challenge: any, progress: number) => Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: any;
}>;
/**
 * Notificação de desafio completado
 */
export declare const notifyChallengeCompleted: (userId: string, challenge: any) => Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: any;
}>;
/**
 * Notificação de badge desbloqueado
 */
export declare const notifyBadgeUnlocked: (userId: string, badge: any) => Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: any;
}>;
/**
 * Notificação de streak em risco
 */
export declare const notifyStreakAtRisk: (userId: string, streakDays: number) => Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: any;
}>;
/**
 * Agendar notificações inteligentes
 * Baseado em horários de maior engajamento do usuário
 */
export declare const scheduleSmartNotifications: (userId: string, userPreferences: any) => Promise<{
    scheduled: number;
    notifications: any[];
}>;
/**
 * Enviar micro-orientação (Nudge)
 */
export declare const notifyDailyNudge: (userId: string, message: string) => Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: any;
}>;
declare const _default: {
    saveSubscription: (userId: string, subscription: PushSubscription) => {
        success: boolean;
    };
    removeSubscription: (userId: string) => {
        success: boolean;
    };
    getSubscription: (userId: string) => webpush.PushSubscription;
    sendPushNotification: (userId: string, payload: any) => Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    sendBulkPushNotifications: (userIds: string[], payload: any) => Promise<{
        successful: number;
        failed: number;
        total: number;
    }>;
    notifyFeaturedChallenge: (userId: string, challenge: any) => Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    notifyActiveChallenge: (userId: string, challenge: any, progress: number) => Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    notifyChallengeCompleted: (userId: string, challenge: any) => Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    notifyBadgeUnlocked: (userId: string, badge: any) => Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    notifyStreakAtRisk: (userId: string, streakDays: number) => Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    scheduleSmartNotifications: (userId: string, userPreferences: any) => Promise<{
        scheduled: number;
        notifications: any[];
    }>;
};
export default _default;
//# sourceMappingURL=notification.service.d.ts.map