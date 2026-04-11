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
        id: string;
        type: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: string | null;
        title: string;
        category: string;
        isActive: boolean;
        startDate: Date | null;
        endDate: Date | null;
        frequency: string | null;
        points: number;
        icon: string | null;
        imageUrl: string | null;
        targetValue: number | null;
        difficulty: string | null;
        estimatedTime: number | null;
        createdBy: string | null;
        sponsor: string | null;
        approvalStatus: string | null;
    }[]>;
    createChallenge(data: any, partnerId: string): Promise<{
        id: string;
        type: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: string | null;
        title: string;
        category: string;
        isActive: boolean;
        startDate: Date | null;
        endDate: Date | null;
        frequency: string | null;
        points: number;
        icon: string | null;
        imageUrl: string | null;
        targetValue: number | null;
        difficulty: string | null;
        estimatedTime: number | null;
        createdBy: string | null;
        sponsor: string | null;
        approvalStatus: string | null;
    }>;
    updateChallenge(id: string, data: any, partnerId: string): Promise<{
        id: string;
        type: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: string | null;
        title: string;
        category: string;
        isActive: boolean;
        startDate: Date | null;
        endDate: Date | null;
        frequency: string | null;
        points: number;
        icon: string | null;
        imageUrl: string | null;
        targetValue: number | null;
        difficulty: string | null;
        estimatedTime: number | null;
        createdBy: string | null;
        sponsor: string | null;
        approvalStatus: string | null;
    }>;
    deleteChallenge(id: string, partnerId: string): Promise<{
        id: string;
        type: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: string | null;
        title: string;
        category: string;
        isActive: boolean;
        startDate: Date | null;
        endDate: Date | null;
        frequency: string | null;
        points: number;
        icon: string | null;
        imageUrl: string | null;
        targetValue: number | null;
        difficulty: string | null;
        estimatedTime: number | null;
        createdBy: string | null;
        sponsor: string | null;
        approvalStatus: string | null;
    }>;
    getSettings(partnerId: string): Promise<any>;
    updateSettings(partnerId: string, engagementSettings: any): Promise<{
        id: string;
        tenantId: string | null;
        personId: string | null;
        userId: string | null;
        name: string | null;
        phone: string | null;
        photo: string | null;
        crm: string | null;
        specialty: string | null;
        specialties: string[];
        institution: string | null;
        experience: number | null;
        experienceYears: number | null;
        rating: number | null;
        totalReviews: number;
        verified: boolean;
        isApproved: boolean;
        rejectionReason: string | null;
        type: string;
        description: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        lat: number | null;
        lng: number | null;
        acceptsEmergency: boolean;
        acceptsInsurance: boolean;
        acceptsOnline: boolean;
        acceptsTelemedicine: boolean;
        cnpj: string | null;
        consultationPrice: number | null;
        education: import("@prisma/client/runtime/library.js").JsonValue | null;
        facilities: string[];
        foundationYear: number | null;
        insurances: string[];
        languages: string[];
        settings: import("@prisma/client/runtime/library.js").JsonValue | null;
        workingHours: import("@prisma/client/runtime/library.js").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Proxies to inAppNotification.service's createNotification
     */
    createNotification(data: any): Promise<{
        id: string;
        personId: string | null;
        userId: string | null;
        type: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        link: string | null;
        data: import("@prisma/client/runtime/library.js").JsonValue | null;
        title: string;
        priority: string | null;
        read: boolean;
    }>;
}
export declare const engagementService: EngagementService;
//# sourceMappingURL=engagement.service.d.ts.map