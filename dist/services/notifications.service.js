"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeNotifications = initializeNotifications;
exports.notifyPharmacyQuote = notifyPharmacyQuote;
exports.notifyPatientQuoteUpdate = notifyPatientQuoteUpdate;
exports.notifyQuoteResponse = notifyQuoteResponse;
const socket_js_1 = require("../lib/socket.js");
function initializeNotifications(server) {
    // Agora delegamos a inicialização para o SocketService centralizado no server.ts
    // Mas mantemos a exportação para não quebrar compatibilidade histórica
    console.log('[Notifications] Initialized as wrapper for SocketService');
}
function notifyPharmacyQuote(pharmacyId, quoteId, waveNumber) {
    try {
        const io = socket_js_1.SocketService.getInstance();
        io.to(`pharmacy:${pharmacyId}`).emit('newQuote', {
            type: 'NEW_QUOTE',
            data: {
                quoteId,
                waveNumber,
                timestamp: new Date().toISOString()
            }
        });
        console.log(`[Notifications] Notified pharmacy ${pharmacyId} about new quote ${quoteId} (wave ${waveNumber})`);
    }
    catch (err) {
        console.error('[Notifications] Failed to notify pharmacy:', err);
    }
}
function notifyPatientQuoteUpdate(patientId, quoteId, status, responseCount) {
    try {
        const io = socket_js_1.SocketService.getInstance();
        io.to(`patient:${patientId}`).emit('quoteUpdate', {
            type: 'QUOTE_UPDATE',
            data: {
                quoteId,
                status,
                responseCount,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (err) {
        console.error('[Notifications] Failed to notify patient:', err);
    }
}
function notifyQuoteResponse(quoteId, pharmacyId) {
    try {
        const io = socket_js_1.SocketService.getInstance();
        io.emit('newResponse', {
            type: 'NEW_RESPONSE',
            data: {
                quoteId,
                pharmacyId,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (err) {
        console.error('[Notifications] Failed to notify quote response:', err);
    }
}
//# sourceMappingURL=notifications.service.js.map