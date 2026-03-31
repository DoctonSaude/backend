import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { PharmacyCrud } from '../crud/pharmacy.crud.js';
import { subsidyService } from './subsidy.service.js';
import { ledgerService, AccountType } from './ledger.service.js';

export class PharmacyService {
    /**
     * Cria um novo pedido de farmácia com suporte a subsídio B2B2C
     */
    async createOrder(userId: string, pharmacyId: string, items: any[]) {
        try {
            // 1. Calcular valor bruto
            const grossAmount = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);

            // 2. Aplicar subsídio se elegível
            const subsidy = await subsidyService.calculateSubsidy(userId, grossAmount);

            // 3. Obter ou criar perfil de paciente
            const patient = await this.getOrCreatePatient(userId);

            // 4. Criar o pedido em transação
            const order = await prisma.$transaction(async (tx) => {
                const newOrder = await (tx as any).pharmacyOrder.create({
                    data: {
                        pharmacyId,
                        patientId: patient.id,
                        totalAmount: subsidy.finalAmount,
                        status: 'PENDING',
                        items: {
                            create: items.map((item: any) => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                price: item.price
                            }))
                        }
                    },
                    include: { items: true }
                });

                // Registrar subsídio se aplicado
                if (subsidy.isEligible && subsidy.subsidyAmount > 0) {
                    const subsidyExpAcc = await ledgerService.getOrCreateAccount('Subsídio Corporativo Farmácia', AccountType.EXPENSE);
                    const patientAcc = await ledgerService.getOrCreateAccount(`Subsídio Paciente: ${patient.id}`, AccountType.LIABILITY, patient.id);

                    await (tx as any).corporateTransaction.create({
                        data: {
                            walletId: patient.id, // Simplification
                            amount: subsidy.subsidyAmount,
                            type: 'CREDIT',
                            description: `Subsídio Farmácia: Pedido ${newOrder.id}`,
                            metadata: { orderId: newOrder.id, benefitId: subsidy.benefitId }
                        }
                    });

                    logger.info(`[Pharmacy] Subsídio de R$ ${subsidy.subsidyAmount} aplicado ao pedido ${newOrder.id}`);
                }

                return newOrder;
            });

            return { order, subsidy };
        }
        catch (error) {
            logger.error('[PharmacyService] Erro ao criar pedido:', error);
            throw error;
        }
    }

    /**
     * Helper para obter ou criar perfil de paciente para um usuário
     */
    async getOrCreatePatient(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { person: { include: { patient: true } } }
        });

        if (user?.person?.patient)
            return user.person.patient;

        // Se o usuário não tem perfil de paciente, criamos um no Person vinculado
        if (!user?.personId)
            throw new Error('Usuário sem registro de Pessoa (Person)');

        return await prisma.patient.create({
            data: {
                personId: user.personId,
                tenantId: user.tenantId
            }
        });
    }

    /**
     * Obtém o catálogo global de produtos
     */
    async getGlobalCatalog() {
        return await (prisma as any).product.findMany({
            where: { isActive: true },
            include: { category: true }
        });
    }

    /**
     * Lista farmácias com seus inventários
     */
    async listPharmacies(tenantId: string) {
        return await PharmacyCrud.listByTenant(tenantId);
    }

    /**
     * Obtém detalhes de uma farmácia específica
     */
    async getPharmacyDetails(pharmacyId: string) {
        return await (prisma as any).pharmacy.findUnique({
            where: { id: pharmacyId },
            include: {
                stocks: {
                    include: { product: true }
                }
            }
        });
    }

    async updatePharmacyLocation(pharmacyId: string, lat: number, lng: number) {
        return await (prisma as any).pharmacy.update({
            where: { id: pharmacyId },
            data: { lat, lng }
        });
    }

    /**
     * Pesquisa avançada de produtos (Smart Search)
     */
    async searchProducts(query: string) {
        return await (prisma as any).product.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { activeIngredient: { contains: query, mode: 'insensitive' } }
                ]
            },
            include: { category: true, stocks: { include: { pharmacy: true } } }
        });
    }

    /**
     * Compara preços de um produto em várias farmácias
     */
    async comparePrices(productId: string) {
        return await (prisma as any).pharmacyStock.findMany({
            where: { productId },
            include: { pharmacy: true },
            orderBy: { price: 'asc' }
        });
    }

    /**
     * Lógica de Carrinho Inteligente (Multi-farmácia)
     */
    async getSmartCart(userId: string) {
        const patient = await this.getOrCreatePatient(userId);
        const cart = await (prisma as any).cart.findUnique({
            where: { patientId: patient.id },
            include: { items: { include: { product: true } } }
        });

        if (!cart)
            return { items: [], bestCombinations: [] };

        // Lógica para encontrar as melhores farmácias para cada item
        const itemsWithPrices = await Promise.all(cart.items.map(async (item) => {
            const prices = await this.comparePrices(item.productId);
            return {
                ...item,
                availableAt: prices
            };
        }));

        return {
            items: itemsWithPrices,
            totalSavings: 0 // To be calculated
        };
    }

    async updateCart(userId: string, productId: string, quantity: number) {
        const patient = await this.getOrCreatePatient(userId);
        const cart = await (prisma as any).cart.upsert({
            where: { patientId: patient.id },
            update: {},
            create: { patientId: patient.id }
        });

        if (quantity <= 0) {
            await (prisma as any).cartItem.deleteMany({
                where: { cartId: cart.id, productId }
            });
        }
        else {
            await (prisma as any).cartItem.upsert({
                where: { cartId_productId: { cartId: (cart as any).id, productId } },
                update: { quantity },
                create: { cartId: (cart as any).id, productId, quantity }
            });
        }

        return this.getSmartCart(userId);
    }

    /**
     * Gerencia pedidos de farmácia
     */
    async getOrders(pharmacyId?: string) {
        const where = pharmacyId ? { pharmacyId } : {};
        return await (prisma as any).pharmacyOrder.findMany({
            where,
            include: {
                patient: { include: { person: true } },
                items: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateOrderStatus(orderId: string, status: string) {
        return await (prisma as any).pharmacyOrder.update({
            where: { id: orderId },
            data: { status }
        });
    }

    /**
     * Sincroniza catálogo de produtos (Mock logic for now)
     */
    async syncExternalCatalog() {
        logger.info('[PharmacyService] Sincronizando catálogo externo...');
        // Futura integração com APIs de distribuidores
        return { success: true, updated: 0 };
    }
}

export const pharmacyService = new PharmacyService();
