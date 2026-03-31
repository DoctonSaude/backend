import webpush, { PushSubscription } from 'web-push';

// VAPID Keys - Em produção, usar variáveis de ambiente
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contato@gestaosaude.com.br';

// Configurar web-push apenas se as chaves estiverem configuradas e parecerem válidas
if (VAPID_PUBLIC_KEY && VAPID_PUBLIC_KEY.length > 20 && VAPID_PRIVATE_KEY && VAPID_PRIVATE_KEY.length > 20) {
  try {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    console.log('✅ Web Push configurado com sucesso');
  } catch (error) {
    console.warn('⚠️ Erro ao configurar Web Push:', error);
  }
} else {
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
const subscriptions: Record<string, PushSubscription> = {};

/**
 * Salvar subscription de um usuário
 */
// CORREÇÃO: Usar tipo correto em vez de 'any'
export const saveSubscription = (userId: string, subscription: PushSubscription) => {
  subscriptions[userId] = subscription;
  console.log(`✅ Subscription salva para usuário ${userId}`);
  return { success: true };
};

/**
 * Remover subscription de um usuário
 */
export const removeSubscription = (userId: string) => {
  delete subscriptions[userId];
  console.log(`🗑️ Subscription removida para usuário ${userId}`);
  return { success: true };
};

/**
 * Obter subscription de um usuário
 */
export const getSubscription = (userId: string) => {
  return subscriptions[userId] || null;
};

/**
 * Enviar notificação push para um usuário específico
 */
export const sendPushNotification = async (userId: string, payload: any) => {
  const subscription = getSubscription(userId);

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

    await webpush.sendNotification(subscription, notificationPayload);
    console.log(`📱 Push notification enviada para usuário ${userId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Erro ao enviar push notification:`, error);

    // Se subscription expirou, remover
    if (error.statusCode === 410) {
      removeSubscription(userId);
    }

    return { success: false, error: error.message };
  }
};

/**
 * Enviar notificação para múltiplos usuários
 */
export const sendBulkPushNotifications = async (userIds: string[], payload: any) => {
  const results = await Promise.allSettled(
    userIds.map(userId => sendPushNotification(userId, payload))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`📊 Notificações enviadas: ${successful} sucesso, ${failed} falhas`);

  return { successful, failed, total: userIds.length };
};

/**
 * Notificação de desafio em destaque (diária)
 */
export const notifyFeaturedChallenge = async (userId: string, challenge: any) => {
  return sendPushNotification(userId, {
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

/**
 * Notificação de lembrete de desafio ativo
 */
export const notifyActiveChallenge = async (userId: string, challenge: any, progress: number) => {
  const percentage = Math.round(progress);

  return sendPushNotification(userId, {
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

/**
 * Notificação de desafio completado
 */
export const notifyChallengeCompleted = async (userId: string, challenge: any) => {
  return sendPushNotification(userId, {
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

/**
 * Notificação de badge desbloqueado
 */
export const notifyBadgeUnlocked = async (userId: string, badge: any) => {
  return sendPushNotification(userId, {
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

/**
 * Notificação de streak em risco
 */
export const notifyStreakAtRisk = async (userId: string, streakDays: number) => {
  return sendPushNotification(userId, {
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

/**
 * Agendar notificações inteligentes
 * Baseado em horários de maior engajamento do usuário
 */
export const scheduleSmartNotifications = async (userId: string, userPreferences: any) => {
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

/**
 * Enviar micro-orientação (Nudge)
 */
export const notifyDailyNudge = async (userId: string, message: string) => {
  return sendPushNotification(userId, {
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

export default {
  saveSubscription,
  removeSubscription,
  getSubscription,
  sendPushNotification,
  sendBulkPushNotifications,
  notifyFeaturedChallenge,
  notifyActiveChallenge,
  notifyChallengeCompleted,
  notifyBadgeUnlocked,
  notifyStreakAtRisk,
  scheduleSmartNotifications
};
