import { sendPushNotification } from './notification.service.js';
import { sendEmail } from './email.service.js';
import { createNotification } from './inAppNotification.service.js';
import { logger } from '../lib/logger.js';

/**
 * UnifiedNotificationService - Orquestrador Central de Notificações
 * Permite enviar mensagens para múltiplos canais simultaneamente.
 */
class UnifiedNotificationService {
    /**
     * Envia uma notificação para um ou mais canais
     */
    async notify(payload: any, channels: string[] = ['in-app']) {
        const results: Record<string, any> = {};
        const targetId = payload.personId || payload.userId;

        logger.info(`[UnifiedNotification] Iniciando envio para ${targetId} via [${channels.join(', ')}]`);

        const promises = channels.map(async (channel) => {
            try {
                switch (channel) {
                    case 'in-app':
                        results['in-app'] = await (createNotification as any)({
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
                        results['push'] = await (sendPushNotification as any)(payload.userId, {
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
                            results['email'] = await (sendEmail as any)({
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
                            logger.warn(`[UnifiedNotification] Email não enviado para ${targetId}: destinatário não fornecido`);
                        }
                        break;
                    case 'whatsapp':
                        logger.info(`[UnifiedNotification] Canal WhatsApp em desenvolvimento para ${targetId}`);
                        break;
                    default:
                        logger.warn(`[UnifiedNotification] Canal não suportado: ${channel}`);
                }
            }
            catch (error) {
                logger.error(`[UnifiedNotification] Erro no canal ${channel} para ${targetId}:`, error);
                results[channel] = { success: false, error: (error as any).message };
            }
        });

        await Promise.all(promises);
        return results;
    }

    async broadcast(payload: any, userIds: string[], channels: any[] = ['in-app']) {
        return Promise.all(userIds.map((id: string) => this.notify({ ...payload, userId: id }, channels)));
    }
}

export default new UnifiedNotificationService();
