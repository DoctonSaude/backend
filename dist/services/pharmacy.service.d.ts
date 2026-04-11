export declare class PharmacyService {
    /**
     * Cria um novo pedido de farmácia com suporte a subsídio B2B2C
     */
    createOrder(userId: string, pharmacyId: string, items: any[]): Promise<{
        order: any;
        subsidy: {
            isEligible: boolean;
            subsidyAmount: number;
            finalAmount: number;
            reason: string;
            benefitId?: undefined;
        } | {
            isEligible: boolean;
            subsidyAmount: number;
            finalAmount: number;
            benefitId: any;
            reason?: undefined;
        };
    }>;
    /**
     * Helper para obter ou criar perfil de paciente para um usuário
     */
    getOrCreatePatient(userId: string): Promise<{
        id: string;
        tenantId: string | null;
        personId: string | null;
        userId: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        settings: import("@prisma/client/runtime/library.js").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
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
        level: number;
        longestStreak: number;
        archetype: string | null;
        blockchainAddress: string | null;
        dateOfBirth: Date | null;
        encryptionPublicKey: string | null;
        experiencePoints: number;
        healthGoals: string[];
        levelTier: string | null;
        levelTitle: string | null;
        lifestyle: import("@prisma/client/runtime/library.js").JsonValue | null;
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
    }>;
    /**
     * Obtém o catálogo global de produtos
     */
    getGlobalCatalog(): Promise<any>;
    /**
     * Lista farmácias com seus inventários
     */
    listPharmacies(tenantId: string): Promise<({
        [x: string]: {
            id: string;
            tenantId: string | null;
            personId: string | null;
            name: string | null;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            password: string;
            role: string;
            avatar: string | null;
            department: string | null;
            emailVerified: boolean;
            jobTitle: string | null;
            pharmacyId: string | null;
            preferredCurrency: string;
            preferredLanguage: string;
        }[] | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            pharmacyId: string | null;
            patientId: string;
            paymentMethod: string | null;
            dosage: string | null;
            medicationName: string;
            quantity: number;
            frequencyDays: number;
            nextRefillDate: Date;
            discountPercent: number;
            autoRefill: boolean;
            lastRefillDate: Date | null;
            totalRefills: number;
        }[] | {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            category: string;
            isActive: boolean;
            price: number;
            brand: string | null;
            lab: string | null;
            barcode: string | null;
            sku: string | null;
            promotionPrice: number | null;
            stock: number;
            stockMin: number;
            validity: Date | null;
            batch: string | null;
        }[] | {
            id: string;
            description: string | null;
            createdAt: Date;
            pharmacyId: string;
            title: string;
            isActive: boolean;
            startDate: Date;
            endDate: Date;
            promotionPrice: number;
            originalPrice: number | null;
            imageUrl: string | null;
            isBoosted: boolean;
        }[] | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            pharmacyId: string;
            deliveryFee: number;
            patientId: string;
            paymentMethod: string | null;
            total: number;
            commissionAmount: number;
            deliveryAddress: string | null;
        }[] | ({
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            pharmacyId: string | null;
            patientId: string;
            paymentMethod: string | null;
            dosage: string | null;
            medicationName: string;
            quantity: number;
            frequencyDays: number;
            nextRefillDate: Date;
            discountPercent: number;
            autoRefill: boolean;
            lastRefillDate: Date | null;
            totalRefills: number;
        } | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            pharmacyId: string | null;
            patientId: string;
            paymentMethod: string | null;
            dosage: string | null;
            medicationName: string;
            quantity: number;
            frequencyDays: number;
            nextRefillDate: Date;
            discountPercent: number;
            autoRefill: boolean;
            lastRefillDate: Date | null;
            totalRefills: number;
        })[] | ({
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            patientId: string;
            orderCount: number;
            totalSpent: number;
            isVIP: boolean;
            lastOrder: Date | null;
        } | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            patientId: string;
            orderCount: number;
            totalSpent: number;
            isVIP: boolean;
            lastOrder: Date | null;
        })[] | ({
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            pharmacyId: string;
            deliveryFee: number;
            patientId: string;
            paymentMethod: string | null;
            total: number;
            commissionAmount: number;
            deliveryAddress: string | null;
        } | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            pharmacyId: string;
            deliveryFee: number;
            patientId: string;
            paymentMethod: string | null;
            total: number;
            commissionAmount: number;
            deliveryAddress: string | null;
        })[] | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            patientId: string;
            orderCount: number;
            totalSpent: number;
            isVIP: boolean;
            lastOrder: Date | null;
        }[] | ({
            id: string;
            tenantId: string | null;
            personId: string | null;
            name: string | null;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            password: string;
            role: string;
            avatar: string | null;
            department: string | null;
            emailVerified: boolean;
            jobTitle: string | null;
            pharmacyId: string | null;
            preferredCurrency: string;
            preferredLanguage: string;
        } | {
            id: string;
            tenantId: string | null;
            personId: string | null;
            name: string | null;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            password: string;
            role: string;
            avatar: string | null;
            department: string | null;
            emailVerified: boolean;
            jobTitle: string | null;
            pharmacyId: string | null;
            preferredCurrency: string;
            preferredLanguage: string;
        })[] | ({
            id: string;
            type: string;
            createdAt: Date;
            value: number;
            pharmacyId: string;
            date: Date;
            metadata: import("@prisma/client/runtime/library.js").JsonValue | null;
        } | {
            id: string;
            type: string;
            createdAt: Date;
            value: number;
            pharmacyId: string;
            date: Date;
            metadata: import("@prisma/client/runtime/library.js").JsonValue | null;
        })[] | ({
            id: string;
            createdAt: Date;
            pharmacyId: string;
            date: Date;
            averagePriceVsMarket: number;
            averageResponseTimeMinutes: number;
            distanceScore: number;
            planScore: number;
            priceCompetitivenessScore: number;
            responseRateScore: number;
            responseTimeScore: number;
            totalQuotesReceived: number;
            totalQuotesResponded: number;
            overallScore: number;
            regionalAveragePrice: number;
            competitorCount: number;
            marketShare: number;
        } | {
            id: string;
            createdAt: Date;
            pharmacyId: string;
            date: Date;
            averagePriceVsMarket: number;
            averageResponseTimeMinutes: number;
            distanceScore: number;
            planScore: number;
            priceCompetitivenessScore: number;
            responseRateScore: number;
            responseTimeScore: number;
            totalQuotesReceived: number;
            totalQuotesResponded: number;
            overallScore: number;
            regionalAveragePrice: number;
            competitorCount: number;
            marketShare: number;
        })[] | ({
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            category: string;
            isActive: boolean;
            price: number;
            brand: string | null;
            lab: string | null;
            barcode: string | null;
            sku: string | null;
            promotionPrice: number | null;
            stock: number;
            stockMin: number;
            validity: Date | null;
            batch: string | null;
        } | {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            category: string;
            isActive: boolean;
            price: number;
            brand: string | null;
            lab: string | null;
            barcode: string | null;
            sku: string | null;
            promotionPrice: number | null;
            stock: number;
            stockMin: number;
            validity: Date | null;
            batch: string | null;
        })[] | ({
            id: string;
            description: string | null;
            createdAt: Date;
            pharmacyId: string;
            title: string;
            isActive: boolean;
            startDate: Date;
            endDate: Date;
            promotionPrice: number;
            originalPrice: number | null;
            imageUrl: string | null;
            isBoosted: boolean;
        } | {
            id: string;
            description: string | null;
            createdAt: Date;
            pharmacyId: string;
            title: string;
            isActive: boolean;
            startDate: Date;
            endDate: Date;
            promotionPrice: number;
            originalPrice: number | null;
            imageUrl: string | null;
            isBoosted: boolean;
        })[] | ({
            id: string;
            createdAt: Date;
            status: string;
            pharmacyId: string;
            price: number;
            observations: string | null;
            quotationId: string;
            isAvailable: boolean;
            deliveryTimeMin: number | null;
            responseTimeSec: number | null;
        } | {
            id: string;
            createdAt: Date;
            status: string;
            pharmacyId: string;
            price: number;
            observations: string | null;
            quotationId: string;
            isAvailable: boolean;
            deliveryTimeMin: number | null;
            responseTimeSec: number | null;
        })[] | {
            id: string;
            type: string;
            createdAt: Date;
            value: number;
            pharmacyId: string;
            date: Date;
            metadata: import("@prisma/client/runtime/library.js").JsonValue | null;
        }[] | {
            id: string;
            createdAt: Date;
            pharmacyId: string;
            date: Date;
            averagePriceVsMarket: number;
            averageResponseTimeMinutes: number;
            distanceScore: number;
            planScore: number;
            priceCompetitivenessScore: number;
            responseRateScore: number;
            responseTimeScore: number;
            totalQuotesReceived: number;
            totalQuotesResponded: number;
            overallScore: number;
            regionalAveragePrice: number;
            competitorCount: number;
            marketShare: number;
        }[] | {
            id: string;
            createdAt: Date;
            status: string;
            pharmacyId: string;
            price: number;
            observations: string | null;
            quotationId: string;
            isAvailable: boolean;
            deliveryTimeMin: number | null;
            responseTimeSec: number | null;
        }[];
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        tenantId: string | null;
        name: string;
        phone: string | null;
        isApproved: boolean;
        address: string | null;
        city: string | null;
        state: string | null;
        lat: number | null;
        lng: number | null;
        cnpj: string | null;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        acceptedPayments: string[];
        averagePriceVsMarket: number;
        averageResponseTimeMinutes: number;
        commissionPercent: number;
        deliveryFee: number | null;
        deliveryMinOrder: number | null;
        deliveryRadius: number | null;
        deliveryTimeAvg: number | null;
        distanceScore: number;
        hasDelivery: boolean;
        isActive: boolean;
        openingHours: string | null;
        performanceScore: number;
        planScore: number;
        priceCompetitivenessScore: number;
        reasonSocial: string | null;
        responseRateScore: number;
        responseTimeScore: number;
        scoreUpdatedAt: Date | null;
        totalQuotesReceived: number;
        totalQuotesResponded: number;
        whatsapp: string | null;
    })[]>;
    /**
     * Obtém detalhes de uma farmácia específica
     */
    getPharmacyDetails(pharmacyId: string): Promise<any>;
    updatePharmacyLocation(pharmacyId: string, lat: number, lng: number): Promise<any>;
    /**
     * Pesquisa avançada de produtos (Smart Search)
     */
    searchProducts(query: string): Promise<any>;
    /**
     * Compara preços de um produto em várias farmácias
     */
    comparePrices(productId: string): Promise<any>;
    /**
     * Lógica de Carrinho Inteligente (Multi-farmácia)
     */
    getSmartCart(userId: string): Promise<{
        items: any[];
        bestCombinations: any[];
        totalSavings?: undefined;
    } | {
        items: any[];
        totalSavings: number;
        bestCombinations?: undefined;
    }>;
    updateCart(userId: string, productId: string, quantity: number): Promise<{
        items: any[];
        bestCombinations: any[];
        totalSavings?: undefined;
    } | {
        items: any[];
        totalSavings: number;
        bestCombinations?: undefined;
    }>;
    /**
     * Gerencia pedidos de farmácia
     */
    getOrders(pharmacyId?: string): Promise<any>;
    updateOrderStatus(orderId: string, status: string): Promise<any>;
    /**
     * Sincroniza catálogo de produtos (Mock logic for now)
     */
    syncExternalCatalog(): Promise<{
        success: boolean;
        updated: number;
    }>;
}
export declare const pharmacyService: PharmacyService;
//# sourceMappingURL=pharmacy.service.d.ts.map