export declare class ReengagementService {
    /**
     * Varre o banco de dados em busca de produtos que estão acabando
     * e dispara notificações personalizadas baseadas no perfil do usuário.
     */
    static processPredictiveReplenishment(): Promise<{
        sentCount: number;
        errorCount: number;
    }>;
    /**
     * Envia uma notificação persuasiva baseada na PRIORIDADE do usuário.
     */
    private static sendPersonalizedAlert;
}
//# sourceMappingURL=reengagement.service.d.ts.map