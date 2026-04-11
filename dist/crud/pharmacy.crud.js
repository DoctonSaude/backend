"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyCrud = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const logger_js_1 = require("../lib/logger.js");
const audit_service_js_1 = require("../services/audit.service.js");
exports.PharmacyCrud = {
    /**
     * Cria uma nova farmácia vinculada a um tenant
     */
    async create(data) {
        try {
            const pharmacy = await prisma_js_1.default.pharmacy.create({
                data,
            });
            logger_js_1.logger.info(`[Pharmacy] Farmácia criada: ${pharmacy.name} (ID: ${pharmacy.id})`);
            return pharmacy;
        }
        catch (error) {
            logger_js_1.logger.error('[Pharmacy] Erro ao criar farmácia:', error);
            throw error;
        }
    },
    /**
     * Lista farmácias de um inquilino
     */
    async listByTenant(tenantId) {
        return await prisma_js_1.default.pharmacy.findMany({
            where: { tenantId },
            include: { stocks: { include: { product: true } } }
        });
    },
    /**
     * Atualiza o estoque de um produto em uma farmácia específica
     */
    async updateInventory(pharmacyId, productId, quantity, price, userId) {
        try {
            const stock = await prisma_js_1.default.pharmacyStock.upsert({
                where: {
                    pharmacyId_productId: { pharmacyId, productId }
                },
                update: {
                    quantity,
                    ...(price && { price })
                },
                create: {
                    pharmacyId,
                    productId,
                    quantity,
                    price: price || 0
                }
            });
            // Auditoria de estoque
            if (userId) {
                await audit_service_js_1.AuditService.log({
                    userId,
                    action: 'INVENTORY_UPDATE',
                    resource: 'PharmacyStock',
                    resourceId: stock.id,
                    payload: { pharmacyId, productId, newQuantity: quantity, price },
                    ipAddress: '0.0.0.0'
                });
            }
            return stock;
        }
        catch (error) {
            logger_js_1.logger.error('[Pharmacy] Erro ao atualizar estoque:', error);
            throw error;
        }
    },
    /**
     * Busca produtos com estoque baixo em uma farmácia (Reposição Inteligente)
     */
    async getLowStock(pharmacyId) {
        return await prisma_js_1.default.pharmacyStock.findMany({
            where: {
                pharmacyId,
                quantity: { lte: 10 }
            },
            include: { product: true }
        });
    }
};
//# sourceMappingURL=pharmacy.crud.js.map