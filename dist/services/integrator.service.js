"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_js_1 = require("../lib/logger.js");
/**
 * IntegratorService - O Hub de Integrações da Docton
 * Centraliza a comunicação com sistemas externos (ERPs, Gateways, etc)
 */
class IntegratorService {
    connectors = new Map();
    /**
     * Registra um novo conector no sistema
     */
    registerConnector(connector) {
        this.connectors.set(connector.name, connector);
        logger_js_1.logger.info(`[Integrator] Conector registrado: ${connector.name} (${connector.type})`);
    }
    /**
     * Orquestra uma chamada para um conector específico
     */
    async orchestrate(connectorName, action, data) {
        const connector = this.connectors.get(connectorName);
        if (!connector) {
            logger_js_1.logger.error(`[Integrator] Conector não encontrado: ${connectorName}`);
            throw new Error(`Conector ${connectorName} não encontrado`);
        }
        logger_js_1.logger.debug(`[Integrator] Executando ${action} em ${connectorName}`);
        try {
            const startTime = Date.now();
            const result = await connector.execute(action, data);
            const duration = Date.now() - startTime;
            logger_js_1.logger.debug(`[Integrator] ${action} em ${connectorName} concluído em ${duration}ms`);
            return result;
        }
        catch (error) {
            logger_js_1.logger.error(`[Integrator] Erro ao executar ${action} em ${connectorName}:`, error);
            throw error;
        }
    }
    /**
     * Lista conectores ativos
     */
    listConnectors() {
        return Array.from(this.connectors.values()).map((c) => ({
            name: c.name,
            type: c.type
        }));
    }
}
exports.default = new IntegratorService();
//# sourceMappingURL=integrator.service.js.map