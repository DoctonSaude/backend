import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
export declare class SocketService {
    private static io;
    static init(server: HttpServer): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
    static getInstance(): Server;
    /**
     * Envia notificação para um usuário específico
     */
    static sendToUser(userId: string, event: string, data: any): void;
    /**
     * Envia notificação para todos os parceiros/farmácias
     */
    static sendToPartners(event: string, data: any): void;
}
//# sourceMappingURL=socket.d.ts.map