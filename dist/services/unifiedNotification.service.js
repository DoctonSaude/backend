"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notification_service_js_1 = require("./notification.service.js");
const email_service_js_1 = require("./email.service.js");
const inAppNotification_service_js_1 = require("./inAppNotification.service.js");
const logger_js_1 = require("../lib/logger.js");
/**
 * UnifiedNotificationService - Orquestrador Central de Notificações
 * Permite enviar mensagens para múltiplos canais simultaneamente.
 */
class UnifiedNotificationService {
    /**
     * Envia uma notificação para um ou mais canais
     */
    async notify(payload, channels = ['in-app']) {
        const results = {};
        const targetId = payload.personId || payload.userId;
        logger_js_1.logger.info(`[UnifiedNotification] Iniciando envio para ${targetId} via [${channels.join(', ')}]`);
        const promises = channels.map(async (channel) => {
            try {
                switch (channel) {
                    case 'in-app':
                        results['in-app'] = await inAppNotification_service_js_1.createNotification({
                            personId: targetId,
                            type: payload.data?.type || 'SYSTEM',
                            title: payload.title,
                            message: payload.message,
                            priority: payload.priority,
                            link: payload.link,
                            data: payload.data
                        });
                        break;
                    case 'push':
                        results['push'] = await notification_service_js_1.sendPushNotification(payload.userId, {
                            title: payload.title,
                            body: payload.message,
                            data: {
                                ...payload.data,
                                url: payload.link
                            }
                        });
                        break;
                    case 'email':
                        if (payload.data?.email || payload.emailData?.email) {
                            const targetEmail = payload.data?.email || payload.emailData?.email;
                            results['email'] = await email_service_js_1.sendEmail({
                                to: targetEmail,
                                subject: payload.title,
                                template: payload.template,
                                data: {
                                    name: payload.data?.userName || 'Usuário',
                                    message: payload.message,
                                    link: payload.link,
                                    ...payload.emailData
                                }
                            });
                        }
                        else {
                            logger_js_1.logger.warn(`[UnifiedNotification] Email não enviado para ${targetId}: destinatário não fornecido`);
                        }
                        break;
                    case 'whatsapp':
                        logger_js_1.logger.info(`[UnifiedNotification] Canal WhatsApp em desenvolvimento para ${targetId}`);
                        break;
                    default:
                        logger_js_1.logger.warn(`[UnifiedNotification] Canal não suportado: ${channel}`);
                }
            }
            catch (error) {
                logger_js_1.logger.error(`[UnifiedNotification] Erro no canal ${channel} para ${targetId}:`, error);
                results[channel] = { success: false, error: error.message };
            }
        });
        await Promise.all(promises);
        return results;
    }
    async broadcast(payload, userIds, channels = ['in-app']) {
        return Promise.all(userIds.map((id) => this.notify({ ...payload, userId: id }, channels)));
    }
}
exports.default = new UnifiedNotificationService();
//# sourceMappingURL=unifiedNotification.service.js.map