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
    getPartnerReviews(partnerId: string): Promise<({
        patient: {
            user: {
                name: string;
                avatar: string;
            };
        } & {
            level: number;
            id: string;
            personId: string | null;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string | null;
            userId: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
            settings: import("../../lib/generated/prisma/runtime/library.js").JsonValue | null;
            allergies: string[];
            birthDate: Date | null;
            bloodType: string | null;
            chronicDiseases: string[];
            cpf: string | null;
            currentMedications: string[];
            currentStreak: number;
            emergencyContact: string | null;
            emergencyPhone: string | null;
            gender: string | null;
            healthPoints: number;
            lastActiveDate: Date | null;
            longestStreak: number;
            archetype: string | null;
            blockchainAddress: string | null;
            dateOfBirth: Date | null;
            encryptionPublicKey: string | null;
            experiencePoints: number;
            healthGoals: string[];
            levelTier: string | null;
            levelTitle: string | null;
            lifestyle: import("../../lib/generated/prisma/runtime/library.js").JsonValue | null;
            medications: string | null;
            onboardingCompleted: boolean;
            referralCode: string | null;
            referralCount: number;
            referralEarnings: number;
            referredBy: string | null;
            totalBadgesEarned: number;
            totalChallengesCompleted: number;
            userIntent: string | null;
            userPriority: string | null;
            familyGroupId: string | null;
            familyRole: string | null;
        };
        appointment: {
            dateTime: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        patientId: string | null;
        partnerId: string;
        appointmentId: string;
        comment: string | null;
        reply: string | null;
        replyDate: Date | null;
    })[]>;
    /**
     * Responde a uma avaliação de paciente.
     */
    replyToReview(reviewId: string, partnerId: string, reply: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        patientId: string | null;
        partnerId: string;
        appointmentId: string;
        comment: string | null;
        reply: string | null;
        replyDate: Date | null;
    }>;
}
export declare const reputationService: ReputationService;
//# sourceMappingURL=reputation.service.d.ts.map