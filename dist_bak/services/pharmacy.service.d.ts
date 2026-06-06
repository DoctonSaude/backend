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
    getOrCreatePatient(userId: string): Promise<any>;
    /**
     * Obtém o catálogo global de produtos
     */
    getGlobalCatalog(): Promise<any>;
    /**
     * Lista farmácias com seus inventários
     */
    listPharmacies(tenantId: string): Promise<({
        [x: string]: ({
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string | null;
            patientId: string;
            dosage: string | null;
            medicationName: string;
            paymentMethod: string | null;
            quantity: number;
            frequencyDays: number;
            nextRefillDate: Date;
            discountPercent: number;
            autoRefill: boolean;
            lastRefillDate: Date | null;
            totalRefills: number;
        } | {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string | null;
            patientId: string;
            dosage: string | null;
            medicationName: string;
            paymentMethod: string | null;
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
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            patientId: string;
            paymentMethod: string | null;
            total: number;
            commissionAmount: number;
            deliveryAddress: string | null;
            deliveryFee: number;
        } | {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            patientId: string;
            paymentMethod: string | null;
            total: number;
            commissionAmount: number;
            deliveryAddress: string | null;
            deliveryFee: number;
        })[] | {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string | null;
            patientId: string;
            dosage: string | null;
            medicationName: string;
            paymentMethod: string | null;
            quantity: number;
            frequencyDays: number;
            nextRefillDate: Date;
            discountPercent: number;
            autoRefill: boolean;
            lastRefillDate: Date | null;
            totalRefills: number;
        }[] | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            patientId: string;
            orderCount: number;
            totalSpent: number;
            isVIP: boolean;
            lastOrder: Date | null;
        }[] | {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            patientId: string;
            paymentMethod: string | null;
            total: number;
            commissionAmount: number;
            deliveryAddress: string | null;
            deliveryFee: number;
        }[] | ({
            name: string | null;
            email: string;
            id: string;
            personId: string | null;
            password: string;
            role: string;
            phone: string | null;
            avatar: string | null;
            createdAt: Date;
            updatedAt: Date;
            department: string | null;
            emailVerified: boolean;
            jobTitle: string | null;
            pharmacyId: string | null;
            preferredCurrency: string;
            preferredLanguage: string;
            tenantId: string | null;
        } | {
            name: string | null;
            email: string;
            id: string;
            personId: string | null;
            password: string;
            role: string;
            phone: string | null;
            avatar: string | null;
            createdAt: Date;
            updatedAt: Date;
            department: string | null;
            emailVerified: boolean;
            jobTitle: string | null;
            pharmacyId: string | null;
            preferredCurrency: string;
            preferredLanguage: string;
            tenantId: string | null;
        })[] | ({
            status: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            price: number;
            observations: string | null;
            quotationId: string;
            isAvailable: boolean;
            deliveryTimeMin: number | null;
            responseTimeSec: number | null;
        } | {
            status: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            price: number;
            observations: string | null;
            quotationId: string;
            isAvailable: boolean;
            deliveryTimeMin: number | null;
            responseTimeSec: number | null;
        })[] | ({
            value: number;
            type: string;
            date: Date;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            metadata: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
        } | {
            value: number;
            type: string;
            date: Date;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            metadata: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
        })[] | ({
            date: Date;
            id: string;
            createdAt: Date;
            pharmacyId: string;
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
            date: Date;
            id: string;
            createdAt: Date;
            pharmacyId: string;
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
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            description: string | null;
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
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            description: string | null;
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
            title: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            description: string | null;
            startDate: Date;
            endDate: Date;
            isActive: boolean;
            imageUrl: string | null;
            promotionPrice: number;
            originalPrice: number | null;
            isBoosted: boolean;
        } | {
            title: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            description: string | null;
            startDate: Date;
            endDate: Date;
            isActive: boolean;
            imageUrl: string | null;
            promotionPrice: number;
            originalPrice: number | null;
            isBoosted: boolean;
        })[] | {
            name: string | null;
            email: string;
            id: string;
            personId: string | null;
            password: string;
            role: string;
            phone: string | null;
            avatar: string | null;
            createdAt: Date;
            updatedAt: Date;
            department: string | null;
            emailVerified: boolean;
            jobTitle: string | null;
            pharmacyId: string | null;
            preferredCurrency: string;
            preferredLanguage: string;
            tenantId: string | null;
        }[] | {
            status: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            price: number;
            observations: string | null;
            quotationId: string;
            isAvailable: boolean;
            deliveryTimeMin: number | null;
            responseTimeSec: number | null;
        }[] | {
            value: number;
            type: string;
            date: Date;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            metadata: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
        }[] | {
            date: Date;
            id: string;
            createdAt: Date;
            pharmacyId: string;
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
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string;
            description: string | null;
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
            title: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            description: string | null;
            startDate: Date;
            endDate: Date;
            isActive: boolean;
            imageUrl: string | null;
            promotionPrice: number;
            originalPrice: number | null;
            isBoosted: boolean;
        }[];
        [x: number]: never;
        [x: symbol]: never;
    } & {
        name: string;
        email: string | null;
        id: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        isActive: boolean;
        address: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        whatsapp: string | null;
        isApproved: boolean;
        lat: number | null;
        lng: number | null;
        cnpj: string | null;
        deliveryFee: number | null;
        acceptedPayments: string[];
        averagePriceVsMarket: number;
        averageResponseTimeMinutes: number;
        commissionPercent: number;
        deliveryMinOrder: number | null;
        deliveryRadius: number | null;
        deliveryTimeAvg: number | null;
        distanceScore: number;
        hasDelivery: boolean;
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
        coverImage: string | null;
        logo: string | null;
        neighborhood: string | null;
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