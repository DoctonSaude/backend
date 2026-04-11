export declare class AIRecommendationService {
    /**
     * Atualiza as estatísticas de produto de um usuário baseado em um novo pedido.
     * Alimenta o "Motor de IA" Nível 1.
     */
    static updatePurchaseStats(userId: string, productName: string): Promise<any>;
    /**
     * Analisa prescrições para gerar predições iniciais de compra.
     * Útil quando o usuário ainda não tem histórico de pedidos, mas subiu uma receita.
     */
    static analyzePrescription(patientId: string, prescriptionId: string): Promise<void>;
}
//# sourceMappingURL=aiRecommendation.service.d.ts.map