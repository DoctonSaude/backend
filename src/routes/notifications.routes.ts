import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import notificationService from '../services/notification.service.js';
import inAppNotificationService from '../services/inAppNotification.service.js';

const router = Router();

/**
 * POST /api/notifications/subscribe
 * Registrar subscription de push notifications
 */
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ error: 'Subscription é obrigatória' });
    }

    const result = notificationService.saveSubscription(userId, subscription);

    res.json({
      message: 'Notificações ativadas com sucesso!',
      ...result
    });
  } catch (error: any) {
    console.error('Erro ao registrar subscription:', error);
    res.status(500).json({ error: 'Erro ao ativar notificações' });
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Remover subscription de push notifications
 */
router.post('/unsubscribe', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const result = notificationService.removeSubscription(userId);

    res.json({
      message: 'Notificações desativadas',
      ...result
    });
  } catch (error: any) {
    console.error('Erro ao remover subscription:', error);
    res.status(500).json({ error: 'Erro ao desativar notificações' });
  }
});

/**
 * GET /api/notifications/vapid-public-key
 * Obter chave pública VAPID para o frontend
 */
router.get('/vapid-public-key', (req, res) => {
  // CORREÇÃO: Remover fallback hardcoded inseguro. Falhar explicitamente se não configurado.
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        error: 'VAPID_PUBLIC_KEY não configurada. Configure a variável de ambiente VAPID_PUBLIC_KEY.'
      });
    }
    // Em desenvolvimento, retornar erro informativo em vez de chave hardcoded
    return res.status(500).json({
      error: 'VAPID_PUBLIC_KEY não configurada. Configure a variável de ambiente para desenvolvimento.',
      hint: 'Para desenvolvimento, você pode gerar chaves VAPID usando: npx web-push generate-vapid-keys'
    });
  }

  res.json({ publicKey });
});

/**
 * POST /api/notifications/test
 * Enviar notificação de teste (apenas em desenvolvimento)
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Endpoint disponível apenas em desenvolvimento' });
    }

    const userId = req.user!.userId;
    const { title, body } = req.body;

    const result = await notificationService.sendPushNotification(userId, {
      title: title || '🧪 Notificação de Teste',
      body: body || 'Esta é uma notificação de teste do Gestão Saúde!',
      tag: 'test-notification',
      data: { url: '/patient/desafios', type: 'test' }
    });

    res.json({
      message: result.success ? 'Notificação de teste enviada!' : 'Falha ao enviar',
      ...result
    });
  } catch (error: any) {
    console.error('Erro ao enviar notificação de teste:', error);
    res.status(500).json({ error: 'Erro ao enviar notificação' });
  }
});

/**
 * POST /api/notifications/send-featured-challenge
 * Enviar notificação de desafio em destaque (admin ou cronjob)
 */
router.post('/send-featured-challenge', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { userId, challenge } = req.body;

    if (!userId || !challenge) {
      return res.status(400).json({ error: 'userId e challenge são obrigatórios' });
    }

    const result = await notificationService.notifyFeaturedChallenge(userId, challenge);

    res.json({
      message: 'Notificação enviada',
      ...result
    });
  } catch (error: any) {
    console.error('Erro ao enviar notificação:', error);
    res.status(500).json({ error: 'Erro ao enviar notificação' });
  }
});

/**
 * POST /api/notifications/bulk-send
 * Enviar notificações em massa (admin ou cronjob)
 */
router.post('/bulk-send', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { userIds, payload } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds deve ser um array não vazio' });
    }

    if (!payload) {
      return res.status(400).json({ error: 'payload é obrigatório' });
    }

    const result = await notificationService.sendBulkPushNotifications(userIds, payload);

    res.json({
      success: true,
      message: `Notificações enviadas para ${result.successful} usuários`,
      ...result
    });
  } catch (error: any) {
    console.error('Erro ao enviar notificações em massa:', error);
    res.status(500).json({ error: 'Erro ao enviar notificações' });
  }
});

/**
 * GET /api/notifications/status
 * Verificar status da subscription do usuário
 */
router.get('/status', authenticate, (req, res) => {
  try {
    const userId = req.user!.userId;

    const subscription = notificationService.getSubscription(userId);

    res.json({
      subscribed: !!subscription,
      hasSubscription: !!subscription
    });
  } catch (error: any) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

/**
 * In-App Notifications (Bell List) CRUD
 */

// GET /api/notifications - Listar notificações do usuário
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    // Admins e Masters podem ver notificações de sistema (userId = null)
    const includeSystem = role === 'ADMIN' || role === 'MASTER';

    try {
      const notifications = await inAppNotificationService.getNotificationsByUser(userId, includeSystem);
      res.json(notifications);
    } catch (serviceErr: any) {
      const msg = serviceErr?.message ? String(serviceErr.message) : String(serviceErr);
      const code = serviceErr?.code;

      const dbUnavailable =
        process.env.NODE_ENV === 'production' &&
        (msg.toLowerCase().includes('tenant or user not found') ||
          msg.toLowerCase().includes('error querying the database') ||
          code === 'P1001');

      if (dbUnavailable) {
        console.log('[Notifications Fallback] DB unavailable; returning empty notifications');

        // Retornar lista vazia para não quebrar o frontend
        res.json({
          notifications: [],
          unreadCount: 0,
          total: 0,
          fallback: true
        });
        return;
      }

      throw serviceErr;
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

// POST /api/notifications - Criar notificação (uso interno/teste)
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const { type, title, message, link, data, priority } = req.body;

    const notification = await inAppNotificationService.createNotification({
      userId,
      type: type || 'system',
      title,
      message,
      link,
      data,
      priority
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ error: 'Erro ao criar notificação' });
  }
});

// PATCH /api/notifications/:id/read - Marcar como lida
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const notification = await inAppNotificationService.markAsRead(req.params.id, userId);
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar notificação' });
  }
});

// POST /api/notifications/mark-all-read - Marcar todas como lidas
router.post('/mark-all-read', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;

    await inAppNotificationService.markAllAsRead(userId);
    res.json({ message: 'Todas as notificações marcadas como lidas' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar notificações' });
  }
});

// DELETE /api/notifications/:id - Deletar notificação
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;

    await inAppNotificationService.deleteNotification(req.params.id, userId);
    res.json({ message: 'Notificação deletada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar notificação' });
  }
});

// DELETE /api/notifications - Limpar todas as notificações
router.delete('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;

    await inAppNotificationService.deleteAllForUser(userId);
    res.json({ message: 'Todas as notificações removidas' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao limpar notificações' });
  }
});

export default router;
