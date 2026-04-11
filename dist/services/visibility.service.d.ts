export declare class VisibilityService {
    /**
     * Calcula o ranking dinâmico de todos os parceiros ativos.
     * ranking = (Relevância * 0.3) + (Qualidade * 0.2) + (Proximidade * 0.2) + (PesoPlano * 0.1) + (BoostImpulso * 0.2)
     */
    updatePartnerRanking(partnerId: string): Promise<{
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
        planTier: string;
        planStatus: string;
        planExpiresAt: Date | null;
        happyHourConfig: import("@prisma/client/runtime/library.js").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        rankingScore: number;
        totalImpressions: number;
        totalClicks: number;
    }>;
    /**
     * Ativa um boost para um parceiro.
     */
    activateBoost(partnerId: string, type: string, price: number, config?: any, durationDays?: number): Promise<{
        id: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        expiresAt: Date | null;
        price: number;
        partnerId: string;
        config: import("@prisma/client/runtime/library.js").JsonValue | null;
    }>;
    /**
     * Retorna estatísticas de visibilidade para o dashboard do parceiro.
     */
    getGrowthStats(partnerId: string): Promise<{
        rankingScore: string;
        rankingPosition: number;
        totalImpressions: number;
        totalClicks: number;
        estimatedLoss: number;
        specialty: string;
        totalAppointments: number;
        activeBoosts: {
            id: string;
            type: string;
            expiresAt: Date;
            price: number;
        }[];
        boostHistory: {
            id: string;
            type: string;
            status: string;
            expiresAt: Date;
            price: number;
            createdAt: Date;
        }[];
        conversionRate: string;
    }>;
    /**
     * Registra uma impressão (visualização na busca)
     */
    recordImpression(partnerId: string): Promise<{
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
        planTier: string;
        planStatus: string;
        planExpiresAt: Date | null;
        happyHourConfig: import("@prisma/client/runtime/library.js").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        rankingScore: number;
        totalImpressions: number;
        totalClicks: number;
    }>;
    /**
     * Registra um clique (acesso ao perfil)
     */
    recordClick(partnerId: string): Promise<{
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
        planTier: string;
        planStatus: string;
        planExpiresAt: Date | null;
        happyHourConfig: import("@prisma/client/runtime/library.js").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        rankingScore: number;
        totalImpressions: number;
        totalClicks: number;
    }>;
}
export declare const visibilityService: VisibilityService;
//# sourceMappingURL=visibility.service.d.ts.map