export interface AuditEvent {
    type: string;
    targetId: string;
    hash: any;
    timestamp?: string;
    integrityCheck?: string;
}
export declare class BlockchainAuditService {
    private auditLogPath;
    /**
     * Registra um evento no log de auditoria imutável (simulado)
     */
    logEvent(event: AuditEvent): Promise<boolean>;
    /**
     * Verifica a integridade de um registro
     */
    verifyIntegrity(targetId: string, currentHash: any): Promise<{
        verified: boolean;
        error: string;
        originalTimestamp?: undefined;
    } | {
        verified: boolean;
        originalTimestamp: any;
        error?: undefined;
    }>;
}
export declare const blockchainAuditService: BlockchainAuditService;
//# sourceMappingURL=blockchain-audit.service.d.ts.map