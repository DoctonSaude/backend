import integratorService from '../services/integrator.service.js';
import { logger } from '../lib/logger.js';
import { PharmacyCrud } from '../crud/pharmacy.crud.js';

/**
 * PharmacyConnector - Implementação do conector para o Módulo Farmácia
 * Permite que o Hub de Integrações execute ações farmacêuticas
 */
export const registerPharmacyConnector = () => {
    integratorService.registerConnector({
        name: 'PharmacyCore',
        type: 'ERP' as any,
        execute: async (action: string, data) => {
            switch (action) {
                case 'UPDATE_STOCK':
                    return await PharmacyCrud.updateInventory(data.pharmacyId, data.productId, data.quantity, data.userId);
                case 'GET_LOW_STOCK':
                    return await PharmacyCrud.getLowStock(data.pharmacyId);
                case 'SYNC_PRODUCTS':
                    logger.info('[Integrator] Sincronizando produtos com ERP externo...');
                    // Lógica de sincronização real viria aqui
                    return { success: true, synced: 0 };
                default:
                    throw new Error(`Ação farmacêutica não suportada: ${action}`);
            }
        }
    });
};
