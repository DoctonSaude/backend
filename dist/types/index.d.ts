export declare enum UserRole {
    PATIENT = "PATIENT",
    PARTNER = "PARTNER",
    ADMIN = "ADMIN"
}
export declare enum PartnerType {
    DOCTOR = "DOCTOR",
    CLINIC = "CLINIC",
    LABORATORY = "LABORATORY"
}
export declare enum AppointmentStatus {
    SCHEDULED = "SCHEDULED",
    CONFIRMED = "CONFIRMED",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    NO_SHOW = "NO_SHOW"
}
export declare enum ChallengeType {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    SPECIAL = "SPECIAL"
}
export declare enum ChallengeStatus {
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    EXPIRED = "EXPIRED"
}
export declare enum BadgeRarity {
    COMMON = "COMMON",
    RARE = "RARE",
    EPIC = "EPIC",
    LEGENDARY = "LEGENDARY",
    MYTHIC = "MYTHIC"
}
export declare enum BadgeCategory {
    CONSISTENCY = "CONSISTENCY",
    EXPLORATION = "EXPLORATION",
    SOCIAL = "SOCIAL",
    MASTERY = "MASTERY"
}
export declare enum LevelTier {
    BRONZE = "BRONZE",
    SILVER = "SILVER",
    GOLD = "GOLD",
    PLATINUM = "PLATINUM",
    DIAMOND = "DIAMOND",
    LEGEND = "LEGEND"
}
export interface User {
    id: string;
    email: string;
    password: string;
    role: UserRole;
    name: string;
    phone?: string;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Patient {
    id: string;
    userId: string;
    cpf: string;
    birthDate: Date;
    gender?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    bloodType?: string;
    allergies: string[];
    chronicDiseases: string[];
    currentMedications: string[];
    emergencyContact?: string;
    emergencyPhone?: string;
    healthPoints: number;
    experiencePoints: number;
    level: number;
    levelTitle?: string;
    levelTier?: LevelTier;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate?: Date;
    totalChallengesCompleted: number;
    totalBadgesEarned: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Partner {
    id: string;
    userId: string;
    type: PartnerType;
    specialty?: string;
    crm?: string;
    cnpj?: string;
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    consultationPrice?: number;
    acceptsOnline: boolean;
    isApproved: boolean;
    rating?: number;
    totalReviews: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Admin {
    id: string;
    userId: string;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface Appointment {
    id: string;
    patientId: string;
    partnerId: string;
    dateTime: Date;
    duration: number;
    status: AppointmentStatus;
    isOnline: boolean;
    meetingLink?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Challenge {
    id: string;
    title: string;
    description: string;
    type: ChallengeType;
    points: number;
    icon?: string;
    targetValue?: number;
    frequency?: string;
    category: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    estimatedTime?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    sponsor?: string;
    startDate?: Date;
    endDate?: Date;
    approvalStatus?: string;
    imageUrl?: string;
    status?: string;
}
export interface PatientChallenge {
    id: string;
    patientId: string;
    challengeId: string;
    status: ChallengeStatus;
    progress: number;
    startDate: Date;
    completedAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: BadgeRarity;
    category: string;
    criteria: {
        type: string;
        value: number;
    };
    isSecret?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface PatientBadge {
    id: string;
    patientId: string;
    badgeId: string;
    unlockedAt: Date;
}
export interface PointsHistory {
    id: string;
    patientId: string;
    points: number;
    action: string;
    description?: string;
    metadata?: any;
    createdAt: Date;
}
export interface Reward {
    id: string;
    name: string;
    description: string;
    icon?: string;
    pointsCost: number;
    category: string;
    isActive: boolean;
    stockQuantity?: number;
    discountPercent?: number;
    partnerInfo?: any;
    createdAt: Date;
    updatedAt: Date;
}
export interface PatientReward {
    id: string;
    patientId: string;
    rewardId: string;
    redeemedAt: Date;
    usedAt?: Date;
    isUsed: boolean;
    code: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface HealthLog {
    id: string;
    patientId: string;
    type: string;
    value: string;
    unit?: string;
    notes?: string;
    logDate: Date;
    createdAt: Date;
}
export interface MedicalRecord {
    id: string;
    appointmentId: string;
    patientId: string;
    partnerId: string;
    diagnosis: string;
    symptoms: string[];
    treatment?: string;
    observations?: string;
    attachments: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface Prescription {
    id: string;
    patientId: string;
    partnerId: string;
    medications: Array<{
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
    }>;
    instructions?: string;
    validUntil?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface Review {
    id: string;
    appointmentId: string;
    partnerId: string;
    rating: number;
    comment?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface PartnerFinancialData {
    id: string;
    partnerId: string;
    bankCode: string;
    bankName: string;
    agency: string;
    accountNumber: string;
    accountType: 'Conta Corrente' | 'Conta Poupança';
    accountHolder: string;
    taxId: string;
    taxIdType: 'CPF' | 'CNPJ';
    stateRegistration?: string;
    billingAddress: string;
    billingCity: string;
    billingState: string;
    billingZipCode: string;
    platformFeePercentage: number;
    paymentFrequency: 'Semanal' | 'Quinzenal' | 'Mensal';
    paymentMethod: 'Transferência Bancária' | 'PIX' | 'TED';
    pixKey?: string;
    pixKeyType?: 'CPF' | 'CNPJ' | 'Email' | 'Telefone' | 'Chave Aleatória';
    createdAt: Date;
    updatedAt: Date;
}
export interface XPTransaction {
    id: string;
    patientId: string;
    actionId: string;
    actionName: string;
    baseXP: number;
    finalXP: number;
    multipliers?: {
        streak?: number;
        perfect?: number;
        combo?: number;
    };
    context?: any;
    createdAt: Date;
}
export interface LevelUpEvent {
    id: string;
    patientId: string;
    previousLevel: number;
    newLevel: number;
    levelTitle: string;
    levelTier: LevelTier;
    rewards: {
        healthPoints?: number;
        badgeId?: string;
        discount?: number;
        specialReward?: string;
    };
    createdAt: Date;
}
export interface BadgeUnlockEvent {
    id: string;
    patientId: string;
    badgeId: string;
    badgeName: string;
    badgeCategory: BadgeCategory;
    badgeRarity: BadgeRarity;
    xpReward: number;
    unlockedAt: Date;
}
export interface VerificationToken {
    id: string;
    email: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}
//# sourceMappingURL=index.d.ts.map