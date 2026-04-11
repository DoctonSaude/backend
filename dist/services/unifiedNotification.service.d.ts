/**
 * UnifiedNotificationService - Orquestrador Central de Notificações
 * Permite enviar mensagens para múltiplos canais simultaneamente.
 */
declare class UnifiedNotificationService {
    /**
     * Envia uma notificação para um ou mais canais
     */
    notify(payload: any, channels?: string[]): Promise<Record<string, any>>;
    broadcast(payload: any, userIds: string[], channels?: any[]): Promise<Record<string, any>[]>;
}
declare const _default: UnifiedNotificationService;
export default _default;
//# sourceMappingURL=unifiedNotification.service.d.ts.map