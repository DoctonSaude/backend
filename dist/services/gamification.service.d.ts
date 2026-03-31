import { Patient, Challenge } from '../types';
/**
 * Adiciona pontos ao paciente e recalcula automaticamente seu nível
 */
export declare const addPoints: (patientId: string, points: number, action: string, description?: string) => Promise<{
    description: string | null;
    id: string;
    createdAt: Date;
    action: string;
    patientId: string;
    points: number;
    metadata: string | null;
    metadataJson: import("../../lib/generated/prisma/runtime/library").JsonValue | null;
}>;
/**
 * Atualiza a sequência (streak) de dias consecutivos do paciente
 */
export declare const updateStreak: (patientId: string) => Promise<{
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
    settings: import("../../lib/generated/prisma/runtime/library").JsonValue | null;
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
    lifestyle: import("../../lib/generated/prisma/runtime/library").JsonValue | null;
    onboardingCompleted: boolean;
    referralCode: string | null;
    referralCount: number;
    referralEarnings: number;
    referredBy: string | null;
    totalChallengesCompleted: number;
    totalBadgesEarned: number;
    blockchainAddress: string | null;
    encryptionPublicKey: string | null;
}>;
/**
 * Atualiza o progresso de um desafio específico do paciente
 */
export declare const updateChallengeProgress: (patientId: string, challengeId: string, progress: number) => Promise<{
    status: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date | null;
    patientId: string;
    startDate: Date;
    challengeId: string;
    progress: number;
    completedAt: Date | null;
}>;
/**
 * Verifica e desbloqueia badges automaticamente
 */
export declare const checkBadgeUnlock: (patientId: string) => Promise<any[]>;
export declare const getLevelInfo: (points: number) => {
    level: number;
    levelName: string;
    currentLevelPoints: number;
    nextLevelPoints: number;
    progress: number;
};
export declare const getRecommendedChallenges: (patient: Patient) => Promise<Challenge[]>;
interface AnonymizedUserData {
    userId: string;
    demographics: {
        ageGroup: '18-25' | '26-35' | '36-45' | '46-55' | '55+';
        activityLevel: 'low' | 'moderate' | 'high';
    };
    metrics: {
        avgStepsWeekly: number;
        avgSleepHours: number;
        heartRateVariability: number;
        challengeCompletionRate: number;
        streakDays: number;
        lastActiveDate: Date;
    };
    behavioral: {
        checkInFrequency: number;
        appointmentFrequency: number;
        churnRisk: 'low' | 'medium' | 'high';
    };
}
interface WellnessCorrelation {
    hypothesis: string;
    correlation: number;
    significance: number;
    sampleSize: number;
    insights: string[];
}
interface WellnessInsight {
    id: string;
    title: string;
    description: string;
    correlation: WellnessCorrelation;
    actionableAdvice: string[];
    contentSuggestions: string[];
}
export declare class SentinelaService {
    private anonymizeUserData;
    generateAnonymizedDataset(): Promise<AnonymizedUserData[]>;
    analyzeActivityChurnCorrelation(): Promise<WellnessCorrelation>;
    analyzeHRVWellnessCorrelation(): Promise<WellnessCorrelation>;
    analyzeConsistencySuccessCorrelation(): Promise<WellnessCorrelation>;
    generateWellnessInsights(): Promise<WellnessInsight[]>;
    generatePhase1Report(): Promise<{
        summary: string;
        correlations: WellnessCorrelation[];
        insights: WellnessInsight[];
        ethicalCompliance: {
            dataAnonymization: boolean;
            noIndividualAlerts: boolean;
            focusOnContent: boolean;
            transparentMethodology: boolean;
        };
        nextSteps: string[];
    }>;
}
export declare const sentinelaService: SentinelaService;
interface GoogleFitData {
    userId: string;
    steps: number;
    date: string;
    timestamp: string;
    source: 'google_fit' | 'manual';
}
interface WearableConnection {
    userId: string;
    platform: 'google_fit' | 'apple_health';
    connected: boolean;
    connectedAt: Date;
    lastSync: Date;
    permissions: string[];
}
interface PilotMetrics {
    totalUsers: number;
    connectedUsers: number;
    connectionRate: number;
    avgDailySteps: number;
    challengesAutoCompleted: number;
    userSatisfaction: number;
    technicalIssues: number;
}
export declare class WearablesPilotService {
    connectWearable(userId: string, platform?: 'google_fit' | 'apple_health'): Promise<{
        success: boolean;
        connection?: WearableConnection;
        error?: string;
    }>;
    syncStepsData(userId: string, date?: string): Promise<GoogleFitData[]>;
    checkAndCompleteStepChallenges(userId: string, stepsToday: number): Promise<{
        challengesCompleted: string[];
        pointsEarned: number;
        notifications: string[];
    }>;
    generatePilotMetrics(): Promise<PilotMetrics>;
    disconnectWearable(userId: string, platform?: string): Promise<boolean>;
    getConnectionStatus(userId: string): Promise<WearableConnection | null>;
    createChallenge(data: Partial<Challenge>): Promise<Challenge>;
    updateChallenge(id: string, data: Partial<Challenge>): Promise<Challenge>;
    deleteChallenge(id: string): Promise<boolean>;
    getPartnerChallenges(partnerId: string): Promise<Challenge[]>;
}
export declare const wearablesPilotService: WearablesPilotService;
export {};
//# sourceMappingURL=gamification.service.d.ts.map