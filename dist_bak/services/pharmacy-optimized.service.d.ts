interface Pharmacy {
    id: string;
    userId: string;
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    openingHours: Record<string, any>;
    specialties: string[];
    services: string[];
    deliveryFee: number;
    rating: number;
    reviewCount: number;
    isActive: boolean;
    verified: boolean;
    deliveryTime?: number;
    createdAt: string;
    updatedAt: string;
}
interface QuoteRequest {
    patientId: string;
    items: Array<{
        medicationId: string;
        quantity: number;
        dosage?: string;
    }>;
    deliveryAddress: string;
    deliveryCoords?: {
        lat: number;
        lng: number;
    };
    urgency: 'normal' | 'urgent' | 'emergency';
}
interface QuoteResponse {
    pharmacyId: string;
    pharmacyName: string;
    estimatedTime: number;
    totalPrice: number;
    items: Array<{
        medicationId: string;
        medicationName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        available: boolean;
    }>;
    deliveryFee: number;
    totalWithDelivery: number;
    message?: string;
}
export declare class PharmacyOptimizedService {
    private redis;
    private readonly CACHE_TTL;
    constructor();
    /**
     * Find nearby pharmacies with advanced filtering and caching
     */
    findNearbyPharmacies(params: {
        lat: number;
        lng: number;
        radiusKm: number;
        filters?: {
            specialties?: string[];
            services?: string[];
            minRating?: number;
            onlyVerified?: boolean;
            onlyActive?: boolean;
            maxDeliveryFee?: number;
        };
        pagination?: {
            limit?: number;
            offset?: number;
        };
        sort?: {
            by: 'distance' | 'rating' | 'price' | 'delivery_time';
            order: 'asc' | 'desc';
        };
    }): Promise<{
        pharmacies: Pharmacy[];
        total: number;
        hasMore: boolean;
    }>;
    /**
     * Get pharmacy details with enhanced caching
     */
    getPharmacyDetails(pharmacyId: string): Promise<Pharmacy | null>;
    /**
     * Get multiple pharmacy details (batch operation)
     */
    getMultiplePharmacies(pharmacyIds: string[]): Promise<Pharmacy[]>;
    /**
     * Generate quotes from multiple pharmacies with intelligent caching
     */
    generateQuotes(request: QuoteRequest): Promise<QuoteResponse[]>;
    /**
     * Update pharmacy performance metrics
     */
    updatePerformanceMetrics(pharmacyId: string, metrics: {
        averageResponseTime?: number;
        acceptanceRate?: number;
        cancellationRate?: number;
        averageDeliveryTime?: number;
        customerRating?: number;
    }): Promise<void>;
    /**
     * Get pharmacy performance metrics
     */
    getPerformanceMetrics(pharmacyId: string): Promise<any>;
    /**
     * Search pharmacies with advanced filters
     */
    searchPharmacies(params: {
        query?: string;
        city?: string;
        state?: string;
        specialties?: string[];
        services?: string[];
        minRating?: number;
        verified?: boolean;
        pagination?: {
            limit?: number;
            offset?: number;
        };
    }): Promise<{
        pharmacies: Pharmacy[];
        total: number;
        hasMore: boolean;
    }>;
    private generateQuoteForPharmacy;
    private calculateAverageDeliveryTime;
}
export declare const pharmacyOptimizedService: PharmacyOptimizedService;
export default pharmacyOptimizedService;
//# sourceMappingURL=pharmacy-optimized.service.d.ts.map