import { logger } from '../lib/logger.js';

export interface Connector {
    name: string;
    type: string;
    execute: (action: string, data) => Promise<any>;
}

/**
 * IntegratorService - O Hub de Integrações da Docton
 * Centraliza a comunicação com sistemas externos (ERPs, Gateways, etc)
 */
class IntegratorService {
    private connectors = new Map<string, Connector>();

    /**
     * Registra um novo conector no sistema
     */
    registerConnector(connector: Connector) {
        this.connectors.set(connector.name, connector);
        logger.info(`[Integrator] Conector registrado: ${connector.name} (${connector.type})`);
    }

    /**
     * Orquestra uma chamada para um conector específico
     */
    async orchestrate(connectorName: string, action: string, data): Promise<any> {
        const connector = this.connectors.get(connectorName);
        if (!connector) {
            logger.error(`[Integrator] Conector não encontrado: ${connectorName}`);
            throw new Error(`Conector ${connectorName} não encontrado`);
        }

        logger.debug(`[Integrator] Executando ${action} em ${connectorName}`);
        try {
            const startTime = Date.now();
            const result = await connector.execute(action, data);
            const duration = Date.now() - startTime;
            logger.debug(`[Integrator] ${action} em ${connectorName} concluído em ${duration}ms`);
            return result;
        }
        catch (error) {
            logger.error(`[Integrator] Erro ao executar ${action} em ${connectorName}:`, error);
            throw error;
        }
    }

    /**
     * Lista conectores ativos
     */
    listConnectors() {
        return Array.from(this.connectors.values()).map((c: any) => ({
            name: c.name,
            type: c.type
        }));
    }
}

export default new IntegratorService();
