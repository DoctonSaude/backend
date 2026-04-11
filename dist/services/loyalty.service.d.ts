export declare class LoyaltyService {
    /**
     * Atribui pontos a um paciente e registra no histórico.
     */
    static awardPoints(patientId: string, points: number, action: string, description: string, metadata?: any): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        action: string;
        patientId: string;
        points: number;
        metadata: string | null;
        metadataJson: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    /**
     * Calcula e atribui pontos baseados em uma transação financeira.
     */
    static processTransactionPoints(transactionId: string): Promise<void>;
    /**
     * Atribui pontos por avaliação (Review).
     */
    static processReviewPoints(patientId: string, reviewId: string): Promise<void>;
}
//# sourceMappingURL=loyalty.service.d.ts.map