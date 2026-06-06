// @ts-nocheck
import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { AuditService } from '../services/audit.service.js';
import { PharmacyData } from '../types/common.js';

export const PharmacyCrud = {
    /**
     * Cria uma nova farmácia vinculada a um tenant
     */
    async create(data: PharmacyData) {
        try {
            const pharmacy = await prisma.pharmacy.create({
                data,
            });
            logger.info(`[Pharmacy] Farmácia criada: ${pharmacy.name} (ID: ${pharmacy.id})`);
            return pharmacy;
        }
        catch (error) {
            logger.error('[Pharmacy] Erro ao criar farmácia:', error);
            throw error;
        }
    },

    /**
     * Lista farmácias de um inquilino
     */
    async listByTenant(tenantId: string) {
        return await prisma.pharmacy.findMany({
            where: { tenantId } as any,
            include: { stocks: { include: { product: true } } } as any
        });
    },

    /**
     * Atualiza o estoque de um produto em uma farmácia específica
     */
    async updateInventory(pharmacyId: string, productId: string, quantity: number, price?: number, userId?: string) {
        try {
            const stock = await (prisma as any).pharmacyStock.upsert({
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
                await AuditService.log({
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
            logger.error('[Pharmacy] Erro ao atualizar estoque:', error);
            throw error;
        }
    },

    /**
     * Busca produtos com estoque baixo em uma farmácia (Reposição Inteligente)
     */
    async getLowStock(pharmacyId: string) {
        return await (prisma as any).pharmacyStock.findMany({
            where: {
                pharmacyId,
                quantity: { lte: 10 }
            },
            include: { product: true }
        });
    }
};
