import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { pharmacyService } from './pharmacy.service.js';

export class MedicationSubscriptionService {
    /**
     * Cria uma nova assinatura de medicamento
     */
    async createSubscription(userId: string, data) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { person: { include: { patient: true } } }
            }) as any;
            const patientId = user?.person?.patient?.id;
            if (!patientId)
                throw new Error('Paciente não encontrado');
            const nextOrderAt = this.calculateNextOrderDate(new Date(), data.frequency);
            const subscription = await (prisma as any).medicationSubscription.create({
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
            logger.info(`[Subscription] Assinatura criada para o paciente ${patientId}: ${data.productId}`);
            return subscription;
        }
        catch (error) {
            logger.error('[SubscriptionService] Erro ao criar assinatura:', error);
            throw error;
        }
    }
    /**
     * Lista assinaturas de um paciente
     */
    async listSubscriptions(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { person: { include: { patient: true } } }
        }) as any;
        const patientId = user?.person?.patient?.id;
        if (!patientId)
            return [];
        return await (prisma as any).medicationSubscription.findMany({
            where: { patientId },
            include: { product: true, pharmacy: true }
        });
    }
    /**
     * Cancela uma assinatura
     */
    async cancelSubscription(userId: string, subscriptionId: string) {
        return await (prisma as any).medicationSubscription.update({
            where: { id: subscriptionId },
            data: { status: 'CANCELLED' }
        });
    }
    /**
     * Processa assinaturas devidas (Job diário)
     */
    async processDueSubscriptions() {
        const now = new Date();
        const dueSubscriptions = await (prisma as any).medicationSubscription.findMany({
            where: {
                status: 'ACTIVE',
                nextOrderAt: { lte: now }
            }
        });
        logger.info(`[Subscription] Processando ${dueSubscriptions.length} assinaturas devidas...`);
        for (const sub of dueSubscriptions) {
            try {
                // 1. Criar o pedido automaticamente
                // Obter o preço atual do estoque
                const stock = await (prisma as any).pharmacyStock.findUnique({
                    where: { pharmacyId_productId: { pharmacyId: sub.pharmacyId, productId: sub.productId } }
                });
                if (stock) {
                    await pharmacyService.createOrder(sub.patientId, sub.pharmacyId, [
                        { productId: sub.productId, quantity: sub.quantity, price: stock.price }
                    ]);
                    // 2. Atualizar próxima data
                    const nextDate = this.calculateNextOrderDate(sub.nextOrderAt, sub.frequency);
                    await (prisma as any).medicationSubscription.update({
                        where: { id: sub.id },
                        data: { nextOrderAt: nextDate }
                    });
                }
            }
            catch (error) {
                logger.error(`[Subscription] Erro ao processar assinatura ${sub.id}:`, error);
            }
        }
    }
    calculateNextOrderDate(currentDate: Date, frequency: string) {
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

export const medicationSubscriptionService = new MedicationSubscriptionService();
