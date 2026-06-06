export declare class PatientService {
    /**
     * Obtém os dados consolidados do dashboard do paciente com cache
     */
    getDashboardData(userId: string): Promise<{
        profile: any;
        stats: {
            totalAppointments: number;
            completedAppointments: number;
            points: any;
            xp: any;
            level: any;
            activeChallenges: number;
            todayMood: string;
        };
        nextAppointment: {
            dateTime: string;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            patientId: string;
            notes: string | null;
            duration: number | null;
            partnerId: string | null;
            isOnline: boolean;
            meetingLink: string | null;
            roomId: string | null;
            equipmentId: string | null;
            professionalId: string | null;
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
                pontos: any;
            }[];
        };
        healthSummary: {
            lastBPM: string;
            lastBMI: string;
            todayMood: string;
        };
        gamification: {
            level: any;
            levelTitle: any;
            levelTier: any;
            healthPoints: any;
            experiencePoints: any;
            currentStreak: any;
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
            level: "MEDIUM" | "HIGH" | "NEUTRAL" | "LOW";
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
        category: any;
        icon: string;
        partner: any;
        avatar: any;
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
     * Invalida o cache do Dashboard para um usuário
     */
    invalidateDashboardCache(userId: string): Promise<void>;
    /**
     * Invalida o cache da timeline para um usuário
     */
    invalidateTimeline(userId: string): Promise<void>;
}
export declare const patientService: PatientService;
//# sourceMappingURL=patient.service.d.ts.map