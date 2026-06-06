"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPharmacyConnector = void 0;
const integrator_service_js_1 = __importDefault(require("../services/integrator.service.js"));
const logger_js_1 = require("../lib/logger.js");
const pharmacy_crud_js_1 = require("../crud/pharmacy.crud.js");
/**
 * PharmacyConnector - Implementação do conector para o Módulo Farmácia
 * Permite que o Hub de Integrações execute ações farmacêuticas
 */
const registerPharmacyConnector = () => {
    integrator_service_js_1.default.registerConnector({
        name: 'PharmacyCore',
        type: 'ERP',
        execute: async (action, data) => {
            switch (action) {
                case 'UPDATE_STOCK':
                    return await pharmacy_crud_js_1.PharmacyCrud.updateInventory(data.pharmacyId, data.productId, data.quantity, data.userId);
                case 'GET_LOW_STOCK':
                    return await pharmacy_crud_js_1.PharmacyCrud.getLowStock(data.pharmacyId);
                case 'SYNC_PRODUCTS':
                    logger_js_1.logger.info('[Integrator] Sincronizando produtos com ERP externo...');
                    // Lógica de sincronização real viria aqui
                    return { success: true, synced: 0 };
                default:
                    throw new Error(`Ação farmacêutica não suportada: ${action}`);
            }
        }
    });
};
exports.registerPharmacyConnector = registerPharmacyConnector;
//# sourceMappingURL=pharmacy.connector.js.map