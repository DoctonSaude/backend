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
        allergies: string[];
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
        userIntent: string | null;
        userPriority: string | null;
        blockchainAddress: string | null;
        encryptionPublicKey: string | null;
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
            email: string;
            personId: string | null;
            password: string;
            role: string;
            name: string | null;
            phone: string | null;
            avatar: string | null;
            emailVerified: boolean;
            tenantId: string | null;
            preferredLanguage: string;
            preferredCurrency: string;
            jobTitle: string | null;
            department: string | null;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string | null;
        }[] | ({
            status: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            patientId: string;
        } | {
            status: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            patientId: string;
        })[] | {
            status: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            patientId: string;
        }[] | ({
            id: string;
            email: string;
            personId: string | null;
            password: string;
            role: string;
            name: string | null;
            phone: string | null;
            avatar: string | null;
            emailVerified: boolean;
            tenantId: string | null;
            preferredLanguage: string;
            preferredCurrency: string;
            jobTitle: string | null;
            department: string | null;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string | null;
        } | {
            id: string;
            email: string;
            personId: string | null;
            password: string;
            role: string;
            name: string | null;
            phone: string | null;
            avatar: string | null;
            emailVerified: boolean;
            tenantId: string | null;
            preferredLanguage: string;
            preferredCurrency: string;
            jobTitle: string | null;
            department: string | null;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string | null;
        })[];
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        name: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        cnpj: string | null;
        isApproved: boolean;
        address: string | null;
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