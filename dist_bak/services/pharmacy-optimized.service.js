"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pharmacyOptimizedService = exports.PharmacyOptimizedService = void 0;
const redis_js_1 = require("../lib/redis.js");
const supabase_client_js_1 = require("../lib/supabase-client.js");
const monitoring_service_js_1 = require("./monitoring.service.js");
const cache_service_js_1 = require("./cache.service.js");
const sb = supabase_client_js_1.supabaseClient;
class PharmacyOptimizedService {
    redis;
    CACHE_TTL = {
        nearby: 300, // 5 minutes
        pharmacy: 600, // 10 minutes
        quotes: 1800, // 30 minutes
        inventory: 900 // 15 minutes
    };
    constructor() {
        this.redis = (0, redis_js_1.getRedisClient)();
        // Register health check
        monitoring_service_js_1.monitoringService.registerHealthCheck('pharmacy_service', async () => {
            try {
                if (!this.redis)
                    return { healthy: true, status: 'disabled' };
                await this.redis.ping();
                return { healthy: true, responseTime: 10 };
            }
            catch (error) {
                return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
    }
    /**
     * Find nearby pharmacies with advanced filtering and caching
     */
    async findNearbyPharmacies(params) {
        const startTime = performance.now();
        try {
            const { lat, lng, radiusKm, filters = {}, pagination = {}, sort = {} } = params;
            // Build cache key
            const cacheKey = cache_service_js_1.CacheService.generateKey('nearby_pharmacies', `${lat}_${lng}`, {
                radiusKm,
                filters,
                pagination,
                sort
            });
            // Try cache first
            const cached = await cache_service_js_1.cacheService.get(cacheKey);
            if (cached) {
                monitoring_service_js_1.monitoringService.recordMetric('pharmacy_nearby_cache_hit', 1);
                return cached;
            }
            // Use PostGIS for efficient geospatial query
            const sortAny = sort;
            const sortParams = {
                sort_by: sortAny.by || 'distance',
                sort_order: sortAny.order || 'asc',
            };
            let query = sb.rpc('nearby_pharmacies_advanced', {
                lat,
                lng,
                radius_km: radiusKm,
                specialty_filter: filters.specialties || null,
                service_filter: filters.services || null,
                min_rating: filters.minRating || 0,
                only_verified: filters.onlyVerified || false,
                only_active: filters.onlyActive !== false,
                max_delivery_fee: filters.maxDeliveryFee || null,
                ...sortParams,
                limit_count: pagination.limit || 20,
                offset_count: pagination.offset || 0
            });
            const { data: pharmacies, error } = await query;
            if (error) {
                console.error('Nearby pharmacies query error:', error);
                throw error;
            }
            const pharmaciesList = (pharmacies || []);
            const result = {
                pharmacies: pharmaciesList,
                total: pharmaciesList.length,
                hasMore: (pagination.limit || 20) === pharmaciesList.length
            };
            // Cache the result
            await cache_service_js_1.cacheService.set(cacheKey, result, { ttl: this.CACHE_TTL.nearby });
            monitoring_service_js_1.monitoringService.recordTimer('pharmacy_nearby_query', performance.now() - startTime);
            monitoring_service_js_1.monitoringService.incrementCounter('pharmacy_nearby_requests');
            return result;
        }
        catch (error) {
            monitoring_service_js_1.monitoringService.incrementCounter('pharmacy_nearby_errors');
            throw error;
        }
    }
    /**
     * Get pharmacy details with enhanced caching
     */
    async getPharmacyDetails(pharmacyId) {
        try {
            const cacheKey = `pharmacy:${pharmacyId}`;
            // Try cache first
            const cached = await cache_service_js_1.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const { data: pharmacy, error } = await sb
                .from('pharmacies')
                .select('*')
                .eq('id', pharmacyId)
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null; // Not found
                throw error;
            }
            // Cache the result
            await cache_service_js_1.cacheService.set(cacheKey, pharmacy, { ttl: this.CACHE_TTL.pharmacy });
            return pharmacy;
        }
        catch (error) {
            console.error('Get pharmacy details error:', error);
            throw error;
        }
    }
    /**
     * Get multiple pharmacy details (batch operation)
     */
    async getMultiplePharmacies(pharmacyIds) {
        try {
            const cacheKeys = pharmacyIds.map(id => `pharmacy:${id}`);
            // Try to get from cache first
            const cachedResults = await cache_service_js_1.cacheService.mget(cacheKeys);
            const uncachedIds = [];
            const results = [];
            cachedResults.forEach((cached, index) => {
                if (cached) {
                    results.push(cached);
                }
                else {
                    uncachedIds.push(pharmacyIds[index]);
                }
            });
            // Fetch uncached pharmacies from database
            if (uncachedIds.length > 0) {
                const { data: pharmacies, error } = await sb
                    .from('pharmacies')
                    .select('*')
                    .in('id', uncachedIds);
                if (error)
                    throw error;
                // Cache the new results
                if (pharmacies) {
                    const cacheEntries = pharmacies.map(pharmacy => ({
                        key: `pharmacy:${pharmacy.id}`,
                        value: pharmacy,
                        options: { ttl: this.CACHE_TTL.pharmacy }
                    }));
                    await cache_service_js_1.cacheService.mset(cacheEntries);
                    results.push(...pharmacies);
                }
            }
            return results;
        }
        catch (error) {
            console.error('Get multiple pharmacies error:', error);
            throw error;
        }
    }
    /**
     * Generate quotes from multiple pharmacies with intelligent caching
     */
    async generateQuotes(request) {
        const startTime = performance.now();
        try {
            // Generate cache key for the quote request
            const cacheKey = cache_service_js_1.CacheService.generateKey('quotes', request.patientId, {
                items: request.items,
                address: request.deliveryAddress,
                urgency: request.urgency
            });
            // Check cache for existing quotes
            const cached = await cache_service_js_1.cacheService.get(cacheKey);
            if (cached) {
                monitoring_service_js_1.monitoringService.recordTimer('pharmacy_quotes_cache_hit', performance.now() - startTime);
                return cached;
            }
            // Find nearby pharmacies first
            const nearbyPharmacies = await this.findNearbyPharmacies({
                lat: request.deliveryCoords?.lat || 0,
                lng: request.deliveryCoords?.lng || 0,
                radiusKm: 20,
                filters: { onlyActive: true, onlyVerified: true },
                pagination: { limit: 10 }
            });
            if (nearbyPharmacies.pharmacies.length === 0) {
                return [];
            }
            // Generate quotes in parallel
            const quotePromises = nearbyPharmacies.pharmacies.map(pharmacy => this.generateQuoteForPharmacy(pharmacy, request));
            const quotes = await Promise.allSettled(quotePromises);
            const validQuotes = quotes
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value)
                .filter(quote => quote.items.some(item => item.available));
            // Sort by total price (including delivery)
            validQuotes.sort((a, b) => a.totalWithDelivery - b.totalWithDelivery);
            // Cache the quotes for a shorter time due to price volatility
            await cache_service_js_1.cacheService.set(cacheKey, validQuotes, {
                ttl: this.CACHE_TTL.quotes,
                tags: ['quotes', `patient:${request.patientId}`]
            });
            monitoring_service_js_1.monitoringService.recordTimer('pharmacy_quotes_generation', performance.now() - startTime);
            monitoring_service_js_1.monitoringService.incrementCounter('pharmacy_quotes_generated');
            monitoring_service_js_1.monitoringService.recordGauge('quotes_per_request', validQuotes.length);
            return validQuotes;
        }
        catch (error) {
            monitoring_service_js_1.monitoringService.incrementCounter('pharmacy_quotes_errors');
            throw error;
        }
    }
    /**
     * Update pharmacy performance metrics
     */
    async updatePerformanceMetrics(pharmacyId, metrics) {
        try {
            const cacheKey = `pharmacy_metrics:${pharmacyId}`;
            // Get existing metrics
            const existing = await cache_service_js_1.cacheService.get(cacheKey) || {};
            // Update with new values
            const updated = {
                ...existing,
                ...metrics,
                lastUpdated: Date.now()
            };
            // Store in cache with longer TTL
            await cache_service_js_1.cacheService.set(cacheKey, updated, {
                ttl: 3600, // 1 hour
                tags: ['pharmacy_metrics', `pharmacy:${pharmacyId}`]
            });
            // Invalidate pharmacy cache to force refresh
            await cache_service_js_1.cacheService.delete(`pharmacy:${pharmacyId}`);
            monitoring_service_js_1.monitoringService.incrementCounter('pharmacy_metrics_updated');
        }
        catch (error) {
            console.error('Update performance metrics error:', error);
            throw error;
        }
    }
    /**
     * Get pharmacy performance metrics
     */
    async getPerformanceMetrics(pharmacyId) {
        try {
            const cacheKey = `pharmacy_metrics:${pharmacyId}`;
            const cached = await cache_service_js_1.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            // Calculate metrics from database if not cached
            const { data: orders } = await sb
                .from('orders')
                .select('status, createdAt, deliveredAt, totalAmount')
                .eq('pharmacyId', pharmacyId)
                .gte('createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days
            if (!orders || orders.length === 0) {
                return {
                    averageResponseTime: 0,
                    acceptanceRate: 0,
                    cancellationRate: 0,
                    averageDeliveryTime: 0,
                    customerRating: 0,
                    totalOrders: 0,
                    lastUpdated: Date.now()
                };
            }
            const completedOrders = orders.filter(o => o.status === 'delivered');
            const cancelledOrders = orders.filter(o => o.status === 'cancelled');
            const metrics = {
                totalOrders: orders.length,
                completedOrders: completedOrders.length,
                cancelledOrders: cancelledOrders.length,
                acceptanceRate: ((orders.length - cancelledOrders.length) / orders.length) * 100,
                cancellationRate: (cancelledOrders.length / orders.length) * 100,
                averageDeliveryTime: this.calculateAverageDeliveryTime(completedOrders),
                customerRating: 0, // Would come from reviews table
                lastUpdated: Date.now()
            };
            // Cache the calculated metrics
            await cache_service_js_1.cacheService.set(cacheKey, metrics, {
                ttl: 3600,
                tags: ['pharmacy_metrics', `pharmacy:${pharmacyId}`]
            });
            return metrics;
        }
        catch (error) {
            console.error('Get performance metrics error:', error);
            throw error;
        }
    }
    /**
     * Search pharmacies with advanced filters
     */
    async searchPharmacies(params) {
        try {
            const cacheKey = cache_service_js_1.CacheService.generateKey('pharmacy_search', 'main', params);
            // Try cache first
            const cached = await cache_service_js_1.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            let query = supabase_client_js_1.supabaseClient
                .from('pharmacies')
                .select('*', { count: 'exact' });
            // Apply filters
            if (params.query) {
                query = query.ilike('name', `%${params.query}%`);
            }
            if (params.city) {
                query = query.eq('city', params.city);
            }
            if (params.state) {
                query = query.eq('state', params.state);
            }
            if (params.minRating) {
                query = query.gte('rating', params.minRating);
            }
            if (params.verified !== undefined) {
                query = query.eq('verified', params.verified);
            }
            if (params.specialties && params.specialties.length > 0) {
                query = query.contains('specialties', params.specialties);
            }
            if (params.services && params.services.length > 0) {
                query = query.contains('services', params.services);
            }
            // Always show active pharmacies
            query = query.eq('isActive', true);
            // Apply pagination
            const { limit = 20, offset = 0 } = params.pagination || {};
            query = query.range(offset, offset + limit - 1);
            // Order by rating and review count
            query = query.order('rating', { ascending: false })
                .order('reviewCount', { ascending: false });
            const { data: pharmacies, error, count } = await query;
            if (error)
                throw error;
            const result = {
                pharmacies: pharmacies || [],
                total: count || 0,
                hasMore: limit === (pharmacies?.length || 0)
            };
            // Cache search results for shorter time
            await cache_service_js_1.cacheService.set(cacheKey, result, {
                ttl: 180, // 3 minutes
                tags: ['pharmacy_search']
            });
            return result;
        }
        catch (error) {
            console.error('Search pharmacies error:', error);
            throw error;
        }
    }
    // Private helper methods
    async generateQuoteForPharmacy(pharmacy, request) {
        try {
            // This would integrate with inventory system
            // For now, return a mock quote
            const items = request.items.map(item => ({
                medicationId: item.medicationId,
                medicationName: `Medication ${item.medicationId}`,
                quantity: item.quantity,
                unitPrice: Math.random() * 50 + 10, // Mock price
                totalPrice: (Math.random() * 50 + 10) * item.quantity,
                available: Math.random() > 0.2 // 80% availability
            }));
            const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
            const deliveryFee = pharmacy.deliveryFee;
            const totalWithDelivery = subtotal + deliveryFee;
            return {
                pharmacyId: pharmacy.id,
                pharmacyName: pharmacy.name,
                estimatedTime: Math.floor(Math.random() * 120) + 30, // 30-150 minutes
                totalPrice: subtotal,
                items,
                deliveryFee,
                totalWithDelivery,
                message: items.some(item => !item.available)
                    ? 'Alguns itens podem não estar disponíveis'
                    : undefined
            };
        }
        catch (error) {
            console.error('Generate quote for pharmacy error:', error);
            throw error;
        }
    }
    calculateAverageDeliveryTime(completedOrders) {
        if (completedOrders.length === 0)
            return 0;
        const deliveryTimes = completedOrders
            .filter(order => order.deliveredAt && order.createdAt)
            .map(order => {
            const created = new Date(order.createdAt).getTime();
            const delivered = new Date(order.deliveredAt).getTime();
            return (delivered - created) / (1000 * 60); // Convert to minutes
        })
            .filter(time => time > 0 && time < 24 * 60); // Filter reasonable times
        if (deliveryTimes.length === 0)
            return 0;
        return deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length;
    }
}
exports.PharmacyOptimizedService = PharmacyOptimizedService;
__decorate([
    (0, cache_service_js_1.Cacheable)({ ttl: 300, tags: ['pharmacies', 'nearby'] })
], PharmacyOptimizedService.prototype, "findNearbyPharmacies", null);
__decorate([
    (0, cache_service_js_1.Cacheable)({ ttl: 600, tags: ['pharmacies'] })
], PharmacyOptimizedService.prototype, "getPharmacyDetails", null);
// Singleton instance
exports.pharmacyOptimizedService = new PharmacyOptimizedService();
exports.default = exports.pharmacyOptimizedService;
//# sourceMappingURL=pharmacy-optimized.service.js.map