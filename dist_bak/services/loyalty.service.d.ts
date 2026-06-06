export declare class LoyaltyService {
    /**
     * Atribui pontos a um paciente e registra no histórico.
     */
    static awardPoints(patientId: string, points: number, action: string, description: string, metadata?: any): Promise<{
        id: string;
        createdAt: Date;
        patientId: string;
        description: string | null;
        points: number;
        action: string;
        metadata: string | null;
        metadataJson: import("lib/generated/prisma/runtime/library").JsonValue | null;
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