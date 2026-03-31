import { SocketService } from '../lib/socket.js';

export function initializeNotifications(server: any) {
    // Agora delegamos a inicialização para o SocketService centralizado no server.ts
    // Mas mantemos a exportação para não quebrar compatibilidade histórica
    console.log('[Notifications] Initialized as wrapper for SocketService');
}

export function notifyPharmacyQuote(pharmacyId: string, quoteId: string, waveNumber: number) {
    try {
        const io = SocketService.getInstance();
        io.to(`pharmacy:${pharmacyId}`).emit('newQuote', {
            type: 'NEW_QUOTE',
            data: {
                quoteId,
                waveNumber,
                timestamp: new Date().toISOString()
            }
        });
        console.log(`[Notifications] Notified pharmacy ${pharmacyId} about new quote ${quoteId} (wave ${waveNumber})`);
    } catch (err) {
        console.error('[Notifications] Failed to notify pharmacy:', err);
    }
}

export function notifyPatientQuoteUpdate(patientId: string, quoteId: string, status: string, responseCount: number) {
    try {
        const io = SocketService.getInstance();
        io.to(`patient:${patientId}`).emit('quoteUpdate', {
            type: 'QUOTE_UPDATE',
            data: {
                quoteId,
                status,
                responseCount,
                timestamp: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('[Notifications] Failed to notify patient:', err);
    }
}

export function notifyQuoteResponse(quoteId: string, pharmacyId: string) {
    try {
        const io = SocketService.getInstance();
        io.emit('newResponse', {
            type: 'NEW_RESPONSE',
            data: {
                quoteId,
                pharmacyId,
                timestamp: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('[Notifications] Failed to notify quote response:', err);
    }
}
