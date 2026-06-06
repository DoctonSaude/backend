export declare class EngagementService {
    /**
     * Inicia uma jornada de tratamento automatizada (Ex: Pós-cirúrgico, Tratamento Crônico)
     */
    startTreatmentJourney(patientId: string, journeyType: 'POST_OP' | 'CHRONIC_FOLLOWUP'): Promise<void>;
    /**
     * Reativação automática de pacientes que não agendam há X dias
     */
    autoReactivateChurningPatients(partnerId: string, daysInactive?: number): Promise<any>;
    listChallenges(partnerId: string): Promise<{
        type: string;
        status: string | null;
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        frequency: string | null;
        startDate: Date | null;
        endDate: Date | null;
        category: string;
        isActive: boolean;
        points: number;
        imageUrl: string | null;
        icon: string | null;
        estimatedTime: number | null;
        targetValue: number | null;
        difficulty: string | null;
        createdBy: string | null;
        sponsor: string | null;
        approvalStatus: string | null;
    }[]>;
    createChallenge(data: any, partnerId: string): Promise<{
        type: string;
        status: string | null;
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        frequency: string | null;
        startDate: Date | null;
        endDate: Date | null;
        category: string;
        isActive: boolean;
        points: number;
        imageUrl: string | null;
        icon: string | null;
        estimatedTime: number | null;
        targetValue: number | null;
        difficulty: string | null;
        createdBy: string | null;
        sponsor: string | null;
        approvalStatus: string | null;
    }>;
    updateChallenge(id: string, data: any, partnerId: string): Promise<{
        type: string;
        status: string | null;
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        frequency: string | null;
        startDate: Date | null;
        endDate: Date | null;
        category: string;
        isActive: boolean;
        points: number;
        imageUrl: string | null;
        icon: string | null;
        estimatedTime: number | null;
        targetValue: number | null;
        difficulty: string | null;
        createdBy: string | null;
        sponsor: string | null;
        approvalStatus: string | null;
    }>;
    deleteChallenge(id: string, partnerId: string): Promise<{
        type: string;
        status: string | null;
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        frequency: string | null;
        startDate: Date | null;
        endDate: Date | null;
        category: string;
        isActive: boolean;
        points: number;
        imageUrl: string | null;
        icon: string | null;
        estimatedTime: number | null;
        targetValue: number | null;
        difficulty: string | null;
        createdBy: string | null;
        sponsor: string | null;
        approvalStatus: string | null;
    }>;
    getSettings(partnerId: string): Promise<any>;
    updateSettings(partnerId: string, engagementSettings: any): Promise<{
        type: string;
        name: string | null;
        id: string;
        personId: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        description: string | null;
        specialty: string | null;
        userId: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        settings: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
        photo: string | null;
        crm: string | null;
        specialties: string[];
        institution: string | null;
        experience: number | null;
        experienceYears: number | null;
        rating: number | null;
        totalReviews: number;
        verified: boolean;
        isApproved: boolean;
        rejectionReason: string | null;
        lat: number | null;
        lng: number | null;
        acceptsEmergency: boolean;
        acceptsInsurance: boolean;
        acceptsOnline: boolean;
        acceptsTelemedicine: boolean;
        cnpj: string | null;
        consultationPrice: number | null;
        education: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
        facilities: string[];
        foundationYear: number | null;
        insurances: string[];
        languages: string[];
        workingHours: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
    }>;
    /**
     * Proxies to inAppNotification.service's createNotification
     */
    createNotification(data: any): Promise<{
        message: string;
        type: string | null;
        link: string | null;
        title: string;
        priority: string | null;
        id: string;
        personId: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        read: boolean;
        dataJson: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
    }>;
}
export declare const engagementService: EngagementService;
//# sourceMappingURL=engagement.service.d.ts.map