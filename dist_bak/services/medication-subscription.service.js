"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicationSubscriptionService = exports.MedicationSubscriptionService = void 0;
// @ts-nocheck
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const logger_js_1 = require("../lib/logger.js");
const pharmacy_service_js_1 = require("./pharmacy.service.js");
class MedicationSubscriptionService {
    /**
     * Cria uma nova assinatura de medicamento
     */
    async createSubscription(userId, data) {
        try {
            const user = await prisma_js_1.default.user.findUnique({
                where: { id: userId },
                include: { person: { include: { patient: true } } }
            });
            const patientId = user?.person?.patient?.id;
            if (!patientId)
                throw new Error('Paciente não encontrado');
            const nextRefillDate = this.calculateNextOrderDate(new Date(), data.frequency || data.frequencyDays);
            const subscription = await prisma_js_1.default.medicationSubscription.create({
                data: {
                    patientId,
                    medicationName: data.medicationName || data.productId || 'Desconhecido',
                    pharmacyId: data.pharmacyId,
                    frequencyDays: typeof data.frequencyDays === 'number' ? data.frequencyDays : typeof data.frequency === 'number' ? data.frequency : data.frequency === 'MONTHLY' ? 30 : 14,
                    quantity: data.quantity,
                    nextRefillDate: nextRefillDate,
                    status: 'ACTIVE'
                },
                include: { pharmacy: true }
            });
            logger_js_1.logger.info(`[Subscription] Assinatura criada para o paciente ${patientId}`);
            return subscription;
        }
        catch (error) {
            logger_js_1.logger.error('[SubscriptionService] Erro ao criar assinatura:', error);
            throw error;
        }
    }
    /**
     * Lista assinaturas de um paciente
     */
    async listSubscriptions(userId) {
        const user = await prisma_js_1.default.user.findUnique({
            where: { id: userId },
            include: { person: { include: { patient: true } } }
        });
        const patientId = user?.person?.patient?.id;
        if (!patientId)
            return [];
        return await prisma_js_1.default.medicationSubscription.findMany({
            where: { patientId },
            include: { pharmacy: true }
        });
    }
    /**
     * Cancela uma assinatura
     */
    async cancelSubscription(userId, subscriptionId) {
        return await prisma_js_1.default.medicationSubscription.update({
            where: { id: subscriptionId },
            data: { status: 'CANCELLED' }
        });
    }
    /**
     * Processa assinaturas devidas (Job diário)
     */
    async processDueSubscriptions() {
        const now = new Date();
        const dueSubscriptions = await prisma_js_1.default.medicationSubscription.findMany({
            where: {
                status: 'ACTIVE',
                nextRefillDate: { lte: now }
            }
        });
        logger_js_1.logger.info(`[Subscription] Processando ${dueSubscriptions.length} assinaturas devidas...`);
        for (const sub of dueSubscriptions) {
            try {
                // 1. Criar o pedido automaticamente
                // Obter o preço atual do estoque se não usar medicationName puro
                if (sub.pharmacyId) {
                    await pharmacy_service_js_1.pharmacyService.createOrder(sub.patientId, sub.pharmacyId, [
                        { productId: sub.medicationName || sub.productId || '1', quantity: sub.quantity || 1, price: 0 } // Requer adaptação manual de price
                    ]);
                    // 2. Atualizar próxima data
                    const nextDate = this.calculateNextOrderDate(sub.nextRefillDate, sub.frequencyDays);
                    await prisma_js_1.default.medicationSubscription.update({
                        where: { id: sub.id },
                        data: { nextRefillDate: nextDate }
                    });
                }
            }
            catch (error) {
                logger_js_1.logger.error(`[Subscription] Erro ao processar assinatura ${sub.id}:`, error);
            }
        }
    }
    calculateNextOrderDate(currentDate, frequency) {
        const next = new Date(currentDate);
        if (typeof frequency === 'number') {
            next.setDate(next.getDate() + frequency);
            return next;
        }
        if (frequency === 'MONTHLY') {
            next.setMonth(next.getMonth() + 1);
        }
        else if (frequency === 'BIWEEKLY') {
            next.setDate(next.getDate() + 14);
        }
        else {
            next.setMonth(next.getMonth() + 1); // fallback
        }
        return next;
    }
}
exports.MedicationSubscriptionService = MedicationSubscriptionService;
exports.medicationSubscriptionService = new MedicationSubscriptionService();
//# sourceMappingURL=medication-subscription.service.js.map