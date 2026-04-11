"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicationSubscriptionService = exports.MedicationSubscriptionService = void 0;
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
            const nextOrderAt = this.calculateNextOrderDate(new Date(), data.frequency);
            const subscription = await prisma_js_1.default.medicationSubscription.create({
                data: {
                    patientId,
                    productId: data.productId,
                    pharmacyId: data.pharmacyId,
                    frequency: data.frequency,
                    quantity: data.quantity,
                    nextOrderAt,
                    status: 'ACTIVE'
                },
                include: { product: true, pharmacy: true }
            });
            logger_js_1.logger.info(`[Subscription] Assinatura criada para o paciente ${patientId}: ${data.productId}`);
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
            include: { product: true, pharmacy: true }
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
                nextOrderAt: { lte: now }
            }
        });
        logger_js_1.logger.info(`[Subscription] Processando ${dueSubscriptions.length} assinaturas devidas...`);
        for (const sub of dueSubscriptions) {
            try {
                // 1. Criar o pedido automaticamente
                // Obter o preço atual do estoque
                const stock = await prisma_js_1.default.pharmacyStock.findUnique({
                    where: { pharmacyId_productId: { pharmacyId: sub.pharmacyId, productId: sub.productId } }
                });
                if (stock) {
                    await pharmacy_service_js_1.pharmacyService.createOrder(sub.patientId, sub.pharmacyId, [
                        { productId: sub.productId, quantity: sub.quantity, price: stock.price }
                    ]);
                    // 2. Atualizar próxima data
                    const nextDate = this.calculateNextOrderDate(sub.nextOrderAt, sub.frequency);
                    await prisma_js_1.default.medicationSubscription.update({
                        where: { id: sub.id },
                        data: { nextOrderAt: nextDate }
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
        if (frequency === 'MONTHLY') {
            next.setMonth(next.getMonth() + 1);
        }
        else if (frequency === 'BIWEEKLY') {
            next.setDate(next.getDate() + 14);
        }
        return next;
    }
}
exports.MedicationSubscriptionService = MedicationSubscriptionService;
exports.medicationSubscriptionService = new MedicationSubscriptionService();
//# sourceMappingURL=medication-subscription.service.js.map