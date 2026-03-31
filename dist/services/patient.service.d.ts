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
                    key: string | null;
                    price: number;
                    duration: string | null;
                    interval: string | null;
                    features: string | null;
                    featuresArray: string[];
                    isActive: boolean;
                    ctaLink: string | null;
                    ctaText: string | null;
                    displayPrice: string | null;
                    isPopular: boolean;
                    order: number;
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
            tenantId: string | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
            settings: import("../../lib/generated/prisma/runtime/library.js").JsonValue | null;
            dateOfBirth: Date | null;
            birthDate: Date | null;
            gender: string | null;
            cpf: string | null;
            bloodType: string | null;
            allergies: string | null;
            allergiesArray: string[];
            chronicDiseases: string[];
            currentMedications: string[];
            medications: string | null;
            emergencyContact: string | null;
            emergencyPhone: string | null;
            archetype: string | null;
            healthPoints: number;
            experiencePoints: number;
            currentStreak: number;
            longestStreak: number;
            lastActiveDate: Date | null;
            levelTier: string | null;
            levelTitle: string | null;
            healthGoals: string[];
            lifestyle: import("../../lib/generated/prisma/runtime/library.js").JsonValue | null;
            onboardingCompleted: boolean;
            referralCode: string | null;
            referralCount: number;
            referralEarnings: number;
            referredBy: string | null;
            totalChallengesCompleted: number;
            totalBadgesEarned: number;
            blockchainAddress: string | null;
            encryptionPublicKey: string | null;
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
     * Invalida o cache do dashboard para um usuário
     */
    invalidateDashboard(userId: string): Promise<void>;
}
export declare const patientService: PatientService;
//# sourceMappingURL=patient.service.d.ts.map