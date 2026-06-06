"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const notification_service_js_1 = __importDefault(require("../services/notification.service.js"));
const inAppNotification_service_js_1 = __importDefault(require("../services/inAppNotification.service.js"));
const router = (0, express_1.Router)();
/**
 * POST /api/notifications/subscribe
 * Registrar subscription de push notifications
 */
router.post('/subscribe', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { subscription } = req.body;
        if (!subscription) {
            return res.status(400).json({ error: 'Subscription é obrigatória' });
        }
        const result = notification_service_js_1.default.saveSubscription(userId, subscription);
        res.json({
            message: 'Notificações ativadas com sucesso!',
            ...result
        });
    }
    catch (error) {
        console.error('Erro ao registrar subscription:', error);
        res.status(500).json({ error: 'Erro ao ativar notificações' });
    }
});
/**
 * POST /api/notifications/unsubscribe
 * Remover subscription de push notifications
 */
router.post('/unsubscribe', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = notification_service_js_1.default.removeSubscription(userId);
        res.json({
            message: 'Notificações desativadas',
            ...result
        });
    }
    catch (error) {
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
router.post('/test', auth_js_1.authenticate, async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Endpoint disponível apenas em desenvolvimento' });
        }
        const userId = req.user.userId;
        const { title, body } = req.body;
        const result = await notification_service_js_1.default.sendPushNotification(userId, {
            title: title || '🧪 Notificação de Teste',
            body: body || 'Esta é uma notificação de teste do Gestão Saúde!',
            tag: 'test-notification',
            data: { url: '/patient/desafios', type: 'test' }
        });
        res.json({
            message: result.success ? 'Notificação de teste enviada!' : 'Falha ao enviar',
            ...result
        });
    }
    catch (error) {
        console.error('Erro ao enviar notificação de teste:', error);
        res.status(500).json({ error: 'Erro ao enviar notificação' });
    }
});
/**
 * POST /api/notifications/send-featured-challenge
 * Enviar notificação de desafio em destaque (admin ou cronjob)
 */
router.post('/send-featured-challenge', auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { userId, challenge } = req.body;
        if (!userId || !challenge) {
            return res.status(400).json({ error: 'userId e challenge são obrigatórios' });
        }
        const result = await notification_service_js_1.default.notifyFeaturedChallenge(userId, challenge);
        res.json({
            message: 'Notificação enviada',
            ...result
        });
    }
    catch (error) {
        console.error('Erro ao enviar notificação:', error);
        res.status(500).json({ error: 'Erro ao enviar notificação' });
    }
});
/**
 * POST /api/notifications/bulk-send
 * Enviar notificações em massa (admin ou cronjob)
 */
router.post('/bulk-send', auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { userIds, payload } = req.body;
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds deve ser um array não vazio' });
        }
        if (!payload) {
            return res.status(400).json({ error: 'payload é obrigatório' });
        }
        const result = await notification_service_js_1.default.sendBulkPushNotifications(userIds, payload);
        res.json({
            success: true,
            message: `Notificações enviadas para ${result.successful} usuários`,
            ...result
        });
    }
    catch (error) {
        console.error('Erro ao enviar notificações em massa:', error);
        res.status(500).json({ error: 'Erro ao enviar notificações' });
    }
});
/**
 * GET /api/notifications/status
 * Verificar status da subscription do usuário
 */
router.get('/status', auth_js_1.authenticate, (req, res) => {
    try {
        const userId = req.user.userId;
        const subscription = notification_service_js_1.default.getSubscription(userId);
        res.json({
            subscribed: !!subscription,
            hasSubscription: !!subscription
        });
    }
    catch (error) {
        console.error('Erro ao verificar status:', error);
        res.status(500).json({ error: 'Erro ao verificar status' });
    }
});
/**
 * In-App Notifications (Bell List) CRUD
 */
// GET /api/notifications - Listar notificações do usuário
router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        res.setHeader('X-Backend-Version', '2026.04.09.v3');
        const userId = req.user.userId;
        const role = req.user.role;
        // Admins e Masters podem ver notificações de sistema (userId = null)
        const includeSystem = role === 'ADMIN' || role === 'MASTER';
        try {
            const notifications = await inAppNotification_service_js_1.default.getNotificationsByUser(userId, includeSystem);
            res.json(notifications);
        }
        catch (serviceErr) {
            // LOG DETALHADO DO ERRO PARA DIAGNÓSTICO EM PRODUÇÃO
            const errorStr = serviceErr?.message || String(serviceErr);
            const errorCode = serviceErr?.code || 'unknown';
            console.error(`[Notifications Error] Code: ${errorCode}, Message: ${errorStr}`);
            // Em produção, se houver QUALQUER erro de banco (ex: tabela ou coluna "dataJson" faltante), 
            // retornamos lista vazia estruturada para não quebrar o frontend (Dashboard).
            if (process.env.NODE_ENV === 'production') {
                return res.json([]);
            }
            throw serviceErr;
        }
    }
    catch (error) {
        console.error('Erro fatal ao buscar notificações:', error);
        res.status(500).json({ error: 'Erro ao buscar notificações', message: error.message });
    }
});
// POST /api/notifications - Criar notificação (uso interno/teste)
router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type, title, message, link, data, priority } = req.body;
        const notification = await inAppNotification_service_js_1.default.createNotification({
            userId,
            type: type || 'system',
            title,
            message,
            link,
            data,
            priority
        });
        res.status(201).json(notification);
    }
    catch (error) {
        console.error('Erro ao criar notificação:', error);
        res.status(500).json({ error: 'Erro ao criar notificação' });
    }
});
// PATCH /api/notifications/:id/read - Marcar como lida
router.patch('/:id/read', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const notification = await inAppNotification_service_js_1.default.markAsRead(req.params.id, userId);
        res.json(notification);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar notificação' });
    }
});
// POST /api/notifications/mark-all-read - Marcar todas como lidas
router.post('/mark-all-read', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        await inAppNotification_service_js_1.default.markAllAsRead(userId);
        res.json({ message: 'Todas as notificações marcadas como lidas' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar notificações' });
    }
});
// DELETE /api/notifications/:id - Deletar notificação
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        await inAppNotification_service_js_1.default.deleteNotification(req.params.id, userId);
        res.json({ message: 'Notificação deletada' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao deletar notificação' });
    }
});
// DELETE /api/notifications - Limpar todas as notificações
router.delete('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        await inAppNotification_service_js_1.default.deleteAllForUser(userId);
        res.json({ message: 'Todas as notificações removidas' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao limpar notificações' });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.routes.js.map