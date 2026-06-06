"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyDailyNudge = exports.scheduleSmartNotifications = exports.notifyStreakAtRisk = exports.notifyBadgeUnlocked = exports.notifyChallengeCompleted = exports.notifyActiveChallenge = exports.notifyFeaturedChallenge = exports.sendBulkPushNotifications = exports.sendPushNotification = exports.getSubscription = exports.removeSubscription = exports.saveSubscription = void 0;
const web_push_1 = __importDefault(require("web-push"));
// VAPID Keys - Em produção, usar variáveis de ambiente
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contato@gestaosaude.com.br';
// Configurar web-push apenas se as chaves estiverem configuradas e parecerem válidas
if (VAPID_PUBLIC_KEY && VAPID_PUBLIC_KEY.length > 20 && VAPID_PRIVATE_KEY && VAPID_PRIVATE_KEY.length > 20) {
    try {
        web_push_1.default.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        console.log('✅ Web Push configurado com sucesso');
    }
    catch (error) {
        console.warn('⚠️ Erro ao configurar Web Push:', error);
    }
}
else {
    console.warn('⚠️ Web Push não configurado (VAPID keys não encontradas)');
}
// CORREÇÃO: Armazenamento temporário de subscriptions
// TODO: Em produção, persistir em banco de dados (ex: PostgreSQL, MongoDB)
// Isso previne perda de subscriptions ao reiniciar o servidor
// Sugestão: Criar tabela/collection 'push_subscriptions' com campos:
// - userId (string, indexado)
// - subscription (JSON)
// - createdAt (Date)
// - expiresAt (Date, opcional)
// - active (boolean)
const subscriptions = {};
/**
 * Salvar subscription de um usuário
 */
// CORREÇÃO: Usar tipo correto em vez de 'any'
const saveSubscription = (userId, subscription) => {
    subscriptions[userId] = subscription;
    console.log(`✅ Subscription salva para usuário ${userId}`);
    return { success: true };
};
exports.saveSubscription = saveSubscription;
/**
 * Remover subscription de um usuário
 */
const removeSubscription = (userId) => {
    delete subscriptions[userId];
    console.log(`🗑️ Subscription removida para usuário ${userId}`);
    return { success: true };
};
exports.removeSubscription = removeSubscription;
/**
 * Obter subscription de um usuário
 */
const getSubscription = (userId) => {
    return subscriptions[userId] || null;
};
exports.getSubscription = getSubscription;
/**
 * Enviar notificação push para um usuário específico
 */
const sendPushNotification = async (userId, payload) => {
    const subscription = (0, exports.getSubscription)(userId);
    if (!subscription) {
        console.log(`⚠️ Usuário ${userId} não tem subscription ativa`);
        return { success: false, error: 'No subscription found' };
    }
    try {
        const notificationPayload = JSON.stringify({
            title: payload.title || 'Gestão Saúde',
            body: payload.body || 'Você tem uma nova notificação',
            icon: payload.icon || '/logo192.png',
            badge: '/logo192.png',
            tag: payload.tag || 'gestao-saude',
            data: payload.data || {},
            actions: payload.actions || [],
            requireInteraction: payload.requireInteraction || false,
        });
        await web_push_1.default.sendNotification(subscription, notificationPayload);
        console.log(`📱 Push notification enviada para usuário ${userId}`);
        return { success: true };
    }
    catch (error) {
        console.error(`❌ Erro ao enviar push notification:`, error);
        // Se subscription expirou, remover
        if (error.statusCode === 410) {
            (0, exports.removeSubscription)(userId);
        }
        return { success: false, error: error.message };
    }
};
exports.sendPushNotification = sendPushNotification;
/**
 * Enviar notificação para múltiplos usuários
 */
const sendBulkPushNotifications = async (userIds, payload) => {
    const results = await Promise.allSettled(userIds.map(userId => (0, exports.sendPushNotification)(userId, payload)));
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`📊 Notificações enviadas: ${successful} sucesso, ${failed} falhas`);
    return { successful, failed, total: userIds.length };
};
exports.sendBulkPushNotifications = sendBulkPushNotifications;
/**
 * Notificação de desafio em destaque (diária)
 */
const notifyFeaturedChallenge = async (userId, challenge) => {
    return (0, exports.sendPushNotification)(userId, {
        title: '🔥 Desafio em Destaque!',
        body: `${challenge.title} - Ganhe +${challenge.points} pontos!`,
        icon: '/logo192.png',
        tag: 'featured-challenge',
        data: {
            url: '/patient/desafios',
            challengeId: challenge.id,
            type: 'featured_challenge'
        },
        actions: [
            { action: 'open', title: 'Ver Desafio' },
            { action: 'close', title: 'Depois' }
        ],
        requireInteraction: true
    });
};
exports.notifyFeaturedChallenge = notifyFeaturedChallenge;
/**
 * Notificação de lembrete de desafio ativo
 */
const notifyActiveChallenge = async (userId, challenge, progress) => {
    const percentage = Math.round(progress);
    return (0, exports.sendPushNotification)(userId, {
        title: '⏰ Continue seu desafio!',
        body: `${challenge.title} - Você está ${percentage}% completo!`,
        icon: '/logo192.png',
        tag: `challenge-reminder-${challenge.id}`,
        data: {
            url: '/patient/desafios',
            challengeId: challenge.id,
            type: 'challenge_reminder'
        }
    });
};
exports.notifyActiveChallenge = notifyActiveChallenge;
/**
 * Notificação de desafio completado
 */
const notifyChallengeCompleted = async (userId, challenge) => {
    return (0, exports.sendPushNotification)(userId, {
        title: '🎉 Desafio Completado!',
        body: `Parabéns! Você ganhou +${challenge.points} HealthPoints!`,
        icon: '/logo192.png',
        tag: `challenge-completed-${challenge.id}`,
        data: {
            url: '/patient/desafios',
            challengeId: challenge.id,
            type: 'challenge_completed'
        },
        requireInteraction: true
    });
};
exports.notifyChallengeCompleted = notifyChallengeCompleted;
/**
 * Notificação de badge desbloqueado
 */
const notifyBadgeUnlocked = async (userId, badge) => {
    return (0, exports.sendPushNotification)(userId, {
        title: '🏆 Novo Badge Desbloqueado!',
        body: `${badge.name} - ${badge.description}`,
        icon: '/logo192.png',
        tag: `badge-unlocked-${badge.id}`,
        data: {
            url: '/patient/desafios',
            badgeId: badge.id,
            type: 'badge_unlocked'
        },
        requireInteraction: true
    });
};
exports.notifyBadgeUnlocked = notifyBadgeUnlocked;
/**
 * Notificação de streak em risco
 */
const notifyStreakAtRisk = async (userId, streakDays) => {
    return (0, exports.sendPushNotification)(userId, {
        title: '🔥 Seu streak está em risco!',
        body: `Não perca sua sequência de ${streakDays} dias! Complete um desafio hoje.`,
        icon: '/logo192.png',
        tag: 'streak-at-risk',
        data: {
            url: '/patient/desafios',
            type: 'streak_at_risk'
        },
        requireInteraction: true
    });
};
exports.notifyStreakAtRisk = notifyStreakAtRisk;
/**
 * Agendar notificações inteligentes
 * Baseado em horários de maior engajamento do usuário
 */
const scheduleSmartNotifications = async (userId, userPreferences) => {
    // Em produção, usar um job scheduler como Bull ou Agenda
    console.log(`📅 Agendando notificações inteligentes para usuário ${userId}`);
    const notifications = [];
    // Notificação matinal (se usuário tem streak ativo)
    if (userPreferences.morningReminder) {
        notifications.push({
            time: userPreferences.morningTime || '09:00',
            type: 'morning_motivation'
        });
    }
    // Notificação noturna (lembrete de progresso)
    if (userPreferences.eveningReminder) {
        notifications.push({
            time: userPreferences.eveningTime || '20:00',
            type: 'evening_progress'
        });
    }
    return { scheduled: notifications.length, notifications };
};
exports.scheduleSmartNotifications = scheduleSmartNotifications;
/**
 * Enviar micro-orientação (Nudge)
 */
const notifyDailyNudge = async (userId, message) => {
    return (0, exports.sendPushNotification)(userId, {
        title: '💡 Dica do Dia',
        body: message,
        icon: '/logo192.png',
        tag: 'daily-nudge',
        data: {
            url: '/patient/health-insights',
            type: 'nudge'
        }
    });
};
exports.notifyDailyNudge = notifyDailyNudge;
exports.default = {
    saveSubscription: exports.saveSubscription,
    removeSubscription: exports.removeSubscription,
    getSubscription: exports.getSubscription,
    sendPushNotification: exports.sendPushNotification,
    sendBulkPushNotifications: exports.sendBulkPushNotifications,
    notifyFeaturedChallenge: exports.notifyFeaturedChallenge,
    notifyActiveChallenge: exports.notifyActiveChallenge,
    notifyChallengeCompleted: exports.notifyChallengeCompleted,
    notifyBadgeUnlocked: exports.notifyBadgeUnlocked,
    notifyStreakAtRisk: exports.notifyStreakAtRisk,
    scheduleSmartNotifications: exports.scheduleSmartNotifications
};
//# sourceMappingURL=notification.service.js.map