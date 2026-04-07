export declare class PatientService {
    /**
     * Obtém os dados consolidados do dashboard do paciente com cache
     */
    getDashboardData(userId: string): Promise<{
        profile: {
            name: string;
            avatar: string;
            email: string;
            plan: string;
            subscriptions: ({
                plan: {
                    description: string | null;
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    isActive: boolean;
                    order: number;
                    key: string | null;
                    price: number;
                    duration: string | null;
                    interval: string | null;
                    features: string | null;
                    featuresArray: string[];
                    ctaLink: string | null;
                    ctaText: string | null;
                    displayPrice: string | null;
                    isPopular: boolean;
                };
            } & {
                status: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                patientId: string;
                planId: string;
                paymentMethod: string | null;
                startDate: Date | null;
                startedAt: Date | null;
                endDate: Date | null;
                cancelledAt: Date | null;
            })[];
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
        stats: {
            totalAppointments: number;
            completedAppointments: number;
            points: number;
            xp: number;
            level: number;
            activeChallenges: number;
            todayMood: string;
        };
        nextAppointment: {
            dateTime: string;
            status: string;
            id: string;
            partner: {
                user: {
                    name: string;
                    avatar: string;
                };
                specialty: string;
            };
            isOnline: boolean;
        };
        charts: {
            activity: any[];
            monthsData: any[];
            typeData: {
                name: string;
                value: number;
                color: string;
            }[];
            pointsData: {
                dia: string;
                pontos: number;
            }[];
        };
        healthSummary: {
            lastBPM: string;
            lastBMI: string;
            todayMood: string;
        };
        gamification: {
            level: number;
            levelTitle: string;
            levelTier: string;
            healthPoints: number;
            experiencePoints: number;
            currentStreak: number;
            nextLevelPoints: number;
        };
        isLowDay: boolean;
        weeklyNarrative: string;
        actionPlan: any[];
        insights: import("./aiInsight.service.js").AiInsight[];
        recentLogs: {
            value: string;
            type: string;
            id: string;
            createdAt: Date;
            patientId: string;
            unit: string | null;
            notes: string | null;
            logDate: Date;
        }[];
        riskProfile: {
            level: string;
            factors: any[];
            updatedAt?: undefined;
        } | {
            level: "LOW" | "MEDIUM" | "HIGH" | "NEUTRAL";
            factors: any[];
            updatedAt: Date;
        };
        dailyNudge: {
            message: string;
            type: string;
        };
    }>;
    /**
     * Obtém a timeline médica consolidada do paciente
     */
    getMedicalTimeline(userId: string): Promise<({
        id: string;
        date: Date;
        type: string;
        title: string;
        description: string;
        status: string;
        category: string;
        icon: string;
        partner: string;
        avatar: string;
    } | {
        id: string;
        date: Date;
        type: string;
        title: string;
        description: string;
        status: string;
        category: string;
        icon: string;
        attachments: string[];
    })[]>;
    /**
     * Invalida o cache da timeline para um usuário
     */
    invalidateTimeline(userId: string): Promise<void>;
}
export declare const patientService: PatientService;
//# sourceMappingURL=patient.service.d.ts.map