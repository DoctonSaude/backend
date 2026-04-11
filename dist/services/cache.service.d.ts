interface CacheOptions {
    ttl?: number;
    tags?: string[];
    compress?: boolean;
    compressLargeValues?: boolean;
}
interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    size: number;
}
export declare class CacheService {
    private redis;
    private localCache;
    private stats;
    constructor();
    /**
     * Get value from cache (local + Redis)
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache (local + Redis)
     */
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * Delete value from cache
     */
    delete(key: string): Promise<void>;
    /**
     * Delete cache by tags
     */
    deleteByTags(tags: string[]): Promise<void>;
    /**
     * Get or set pattern (cache-aside)
     */
    getOrSet<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T>;
    /**
     * Cache warming - pre-load common data
     */
    warmup<T>(entries: Array<{
        key: string;
        fetcher: () => Promise<T>;
        options?: CacheOptions;
    }>): Promise<void>;
    /**
     * Increment counter
     */
    increment(key: string, amount?: number, ttl?: number): Promise<number>;
    /**
     * Get multiple values
     */
    mget<T>(keys: string[]): Promise<(T | null)[]>;
    /**
     * Set multiple values
     */
    mset<T>(entries: Array<{
        key: string;
        value: T;
        options?: CacheOptions;
    }>): Promise<void>;
    /**
     * Search cache by pattern
     */
    search(pattern: string): Promise<string[]>;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Clear all cache
     */
    clear(): Promise<void>;
    /**
     * Generate cache key with namespace
     */
    static generateKey(namespace: string, identifier: string, params?: Record<string, any>): string;
    private getFromLocal;
    private setToLocal;
    private cleanupLocalCache;
    private addToTags;
}
export declare const cacheService: CacheService;
export declare function Cacheable(options?: CacheOptions): (target: any, propertyName: string, descriptor: PropertyDescriptor) => void;
export declare function CacheInvalidate(tags: string[]): (target: any, propertyName: string, descriptor: PropertyDescriptor) => void;
export default cacheService;
//# sourceMappingURL=cache.service.d.ts.map