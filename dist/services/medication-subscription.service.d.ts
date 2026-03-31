export declare class MedicationSubscriptionService {
    /**
     * Cria uma nova assinatura de medicamento
     */
    createSubscription(userId: string, data: any): Promise<any>;
    /**
     * Lista assinaturas de um paciente
     */
    listSubscriptions(userId: string): Promise<any>;
    /**
     * Cancela uma assinatura
     */
    cancelSubscription(userId: string, subscriptionId: string): Promise<any>;
    /**
     * Processa assinaturas devidas (Job diário)
     */
    processDueSubscriptions(): Promise<void>;
    calculateNextOrderDate(currentDate: Date, frequency: string): Date;
}
export declare const medicationSubscriptionService: MedicationSubscriptionService;
//# sourceMappingURL=medication-subscription.service.d.ts.map