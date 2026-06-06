"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pharmacyService = exports.PharmacyService = void 0;
// @ts-nocheck
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const logger_js_1 = require("../lib/logger.js");
const pharmacy_crud_js_1 = require("../crud/pharmacy.crud.js");
const subsidy_service_js_1 = require("./subsidy.service.js");
const ledger_service_js_1 = require("./ledger.service.js");
class PharmacyService {
    /**
     * Cria um novo pedido de farmácia com suporte a subsídio B2B2C
     */
    async createOrder(userId, pharmacyId, items) {
        try {
            // 1. Calcular valor bruto
            const grossAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            // 2. Aplicar subsídio se elegível
            const subsidy = await subsidy_service_js_1.subsidyService.calculateSubsidy(userId, grossAmount);
            // 3. Obter ou criar perfil de paciente
            const patient = await this.getOrCreatePatient(userId);
            // 4. Criar o pedido em transação
            const order = await prisma_js_1.default.$transaction(async (tx) => {
                const newOrder = await tx.pharmacyOrder.create({
                    data: {
                        pharmacyId,
                        patientId: patient.id,
                        totalAmount: subsidy.finalAmount,
                        status: 'PENDING',
                        items: {
                            create: items.map((item) => ({
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
                    const subsidyExpAcc = await ledger_service_js_1.ledgerService.getOrCreateAccount('Subsídio Corporativo Farmácia', ledger_service_js_1.AccountType.EXPENSE);
                    const patientAcc = await ledger_service_js_1.ledgerService.getOrCreateAccount(`Subsídio Paciente: ${patient.id}`, ledger_service_js_1.AccountType.LIABILITY, patient.id);
                    await tx.corporateTransaction.create({
                        data: {
                            walletId: patient.id, // Simplification
                            amount: subsidy.subsidyAmount,
                            type: 'CREDIT',
                            description: `Subsídio Farmácia: Pedido ${newOrder.id}`,
                            metadata: { orderId: newOrder.id, benefitId: subsidy.benefitId }
                        }
                    });
                    logger_js_1.logger.info(`[Pharmacy] Subsídio de R$ ${subsidy.subsidyAmount} aplicado ao pedido ${newOrder.id}`);
                }
                return newOrder;
            });
            return { order, subsidy };
        }
        catch (error) {
            logger_js_1.logger.error('[PharmacyService] Erro ao criar pedido:', error);
            throw error;
        }
    }
    /**
     * Helper para obter ou criar perfil de paciente para um usuário
     */
    async getOrCreatePatient(userId) {
        const user = await prisma_js_1.default.user.findUnique({
            where: { id: userId },
            include: { person: { include: { patient: true } } }
        });
        if (user?.person?.patient)
            return user.person.patient;
        // Se o usuário não tem perfil de paciente, criamos um no Person vinculado
        if (!user?.personId)
            throw new Error('Usuário sem registro de Pessoa (Person)');
        return await prisma_js_1.default.patient.create({
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
        return await prisma_js_1.default.product.findMany({
            where: { isActive: true },
            include: { category: true }
        });
    }
    /**
     * Lista farmácias com seus inventários
     */
    async listPharmacies(tenantId) {
        return await pharmacy_crud_js_1.PharmacyCrud.listByTenant(tenantId);
    }
    /**
     * Obtém detalhes de uma farmácia específica
     */
    async getPharmacyDetails(pharmacyId) {
        return await prisma_js_1.default.pharmacy.findUnique({
            where: { id: pharmacyId },
            include: {
                stocks: {
                    include: { product: true }
                }
            }
        });
    }
    async updatePharmacyLocation(pharmacyId, lat, lng) {
        return await prisma_js_1.default.pharmacy.update({
            where: { id: pharmacyId },
            data: { lat, lng }
        });
    }
    /**
     * Pesquisa avançada de produtos (Smart Search)
     */
    async searchProducts(query) {
        return await prisma_js_1.default.product.findMany({
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
    async comparePrices(productId) {
        return await prisma_js_1.default.pharmacyStock.findMany({
            where: { productId },
            include: { pharmacy: true },
            orderBy: { price: 'asc' }
        });
    }
    /**
     * Lógica de Carrinho Inteligente (Multi-farmácia)
     */
    async getSmartCart(userId) {
        const patient = await this.getOrCreatePatient(userId);
        const cart = await prisma_js_1.default.cart.findUnique({
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
    async updateCart(userId, productId, quantity) {
        const patient = await this.getOrCreatePatient(userId);
        const cart = await prisma_js_1.default.cart.upsert({
            where: { patientId: patient.id },
            update: {},
            create: { patientId: patient.id }
        });
        if (quantity <= 0) {
            await prisma_js_1.default.cartItem.deleteMany({
                where: { cartId: cart.id, productId }
            });
        }
        else {
            await prisma_js_1.default.cartItem.upsert({
                where: { cartId_productId: { cartId: cart.id, productId } },
                update: { quantity },
                create: { cartId: cart.id, productId, quantity }
            });
        }
        return this.getSmartCart(userId);
    }
    /**
     * Gerencia pedidos de farmácia
     */
    async getOrders(pharmacyId) {
        const where = pharmacyId ? { pharmacyId } : {};
        return await prisma_js_1.default.pharmacyOrder.findMany({
            where,
            include: {
                patient: { include: { person: true } },
                items: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async updateOrderStatus(orderId, status) {
        return await prisma_js_1.default.pharmacyOrder.update({
            where: { id: orderId },
            data: { status }
        });
    }
    /**
     * Sincroniza catálogo de produtos (Mock logic for now)
     */
    async syncExternalCatalog() {
        logger_js_1.logger.info('[PharmacyService] Sincronizando catálogo externo...');
        // Futura integração com APIs de distribuidores
        return { success: true, updated: 0 };
    }
}
exports.PharmacyService = PharmacyService;
exports.pharmacyService = new PharmacyService();
//# sourceMappingURL=pharmacy.service.js.map