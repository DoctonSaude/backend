export interface Connector {
    name: string;
    type: string;
    execute: (action: string, data: any) => Promise<any>;
}
/**
 * IntegratorService - O Hub de Integrações da Docton
 * Centraliza a comunicação com sistemas externos (ERPs, Gateways, etc)
 */
declare class IntegratorService {
    private connectors;
    /**
     * Registra um novo conector no sistema
     */
    registerConnector(connector: Connector): void;
    /**
     * Orquestra uma chamada para um conector específico
     */
    orchestrate(connectorName: string, action: string, data: any): Promise<any>;
    /**
     * Lista conectores ativos
     */
    listConnectors(): {
        name: any;
        type: any;
    }[];
}
declare const _default: IntegratorService;
export default _default;
//# sourceMappingURL=integrator.service.d.ts.map