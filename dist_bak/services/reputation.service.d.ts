export declare class ReputationService {
    /**
     * Calcula o NPS (Net Promoter Score) e estatísticas de avaliação do parceiro.
     */
    getReputationStats(partnerId: string): Promise<{
        averageRating: number;
        totalReviews: number;
        nps: number;
        distribution: any;
    }>;
    /**
     * Busca todas as avaliações com detalhes do paciente e agendamento.
     */
    getPartnerReviews(partnerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string | null;
        appointmentId: string;
        rating: number;
        partnerId: string;
        comment: string | null;
        reply: string | null;
        replyDate: Date | null;
    }[]>;
    /**
     * Responde a uma avaliação de paciente.
     */
    replyToReview(reviewId: string, partnerId: string, reply: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string | null;
        appointmentId: string;
        rating: number;
        partnerId: string;
        comment: string | null;
        reply: string | null;
        replyDate: Date | null;
    }>;
}
export declare const reputationService: ReputationService;
//# sourceMappingURL=reputation.service.d.ts.map