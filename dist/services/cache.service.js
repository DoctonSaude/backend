"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
exports.Cacheable = Cacheable;
exports.CacheInvalidate = CacheInvalidate;
const redis_js_1 = require("../lib/redis.js");
const env_js_1 = require("../config/env.js");
const crypto_1 = require("crypto");
class CacheService {
    redis;
    localCache = new Map();
    stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0
    };
    constructor() {
        this.redis = (0, redis_js_1.getRedisClient)();
        if (!this.redis && env_js_1.env.NODE_ENV === 'production') {
            console.warn('[cache] REDIS_URL não configurada. O CacheService funcionará apenas com cache local, o que não é recomendado para ambientes multi-instância.');
        }
        // Cleanup expired local cache entries every minute
        setInterval(() => this.cleanupLocalCache(), 60000);
    }
    /**
     * Get value from cache (local + Redis)
     */
    async get(key) {
        try {
            // Try local cache first
            const localValue = this.getFromLocal(key);
            if (localValue !== null) {
                this.stats.hits++;
                return localValue;
            }
            // Try Redis
            const redisValue = await this.redis.get(key);
            if (redisValue !== null) {
                const parsed = JSON.parse(redisValue);
                // Store in local cache for faster access
                this.setToLocal(key, parsed, 300); // 5 minutes local cache
                this.stats.hits++;
                return parsed;
            }
            this.stats.misses++;
            return null;
        }
        catch (error) {
            console.error('Cache get error:', error);
            this.stats.misses++;
            return null;
        }
    }
    /**
     * Set value in cache (local + Redis)
     */
    async set(key, value, options = {}) {
        try {
            const { ttl = 3600, tags = [], compress = false } = options;
            // Prepare value
            let serializedValue = JSON.stringify(value);
            // Compress if enabled and value is large
            if (compress && serializedValue.length > 1024) {
                // In production, you'd use zlib compression
                serializedValue = serializedValue;
            }
            // Set in Redis
            if (ttl > 0) {
                await this.redis.setex(key, ttl, serializedValue);
            }
            else {
                await this.redis.set(key, serializedValue);
            }
            // Set in local cache
            this.setToLocal(key, value, Math.min(ttl, 300)); // Max 5 minutes local
            // Add to tags for invalidation
            if (tags.length > 0) {
                await this.addToTags(key, tags);
            }
            this.stats.sets++;
        }
        catch (error) {
            console.error('Cache set error:', error);
        }
    }
    /**
     * Delete value from cache
     */
    async delete(key) {
        try {
            await this.redis.del(key);
            this.localCache.delete(key);
            this.stats.deletes++;
        }
        catch (error) {
            console.error('Cache delete error:', error);
        }
    }
    /**
     * Delete cache by tags
     */
    async deleteByTags(tags) {
        try {
            for (const tag of tags) {
                const keys = await this.redis.smembers(`tag:${tag}`);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    keys.forEach(key => this.localCache.delete(key));
                }
                await this.redis.del(`tag:${tag}`);
            }
        }
        catch (error) {
            console.error('Cache deleteByTags error:', error);
        }
    }
    /**
     * Get or set pattern (cache-aside)
     */
    async getOrSet(key, fetcher, options = {}) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        const value = await fetcher();
        await this.set(key, value, options);
        return value;
    }
    /**
     * Cache warming - pre-load common data
     */
    async warmup(entries) {
        const promises = entries.map(async ({ key, fetcher, options }) => {
            try {
                const exists = await this.redis.exists(key);
                if (!exists) {
                    const value = await fetcher();
                    await this.set(key, value, options);
                }
            }
            catch (error) {
                console.error(`Cache warmup error for key ${key}:`, error);
            }
        });
        await Promise.all(promises);
    }
    /**
     * Increment counter
     */
    async increment(key, amount = 1, ttl) {
        try {
            const result = await this.redis.incrby(key, amount);
            if (ttl) {
                await this.redis.expire(key, ttl);
            }
            return result;
        }
        catch (error) {
            console.error('Cache increment error:', error);
            return 0;
        }
    }
    /**
     * Get multiple values
     */
    async mget(keys) {
        try {
            const values = await this.redis.mget(...keys);
            return values.map(value => {
                if (value === null)
                    return null;
                try {
                    return JSON.parse(value);
                }
                catch {
                    return null;
                }
            });
        }
        catch (error) {
            console.error('Cache mget error:', error);
            return keys.map(() => null);
        }
    }
    /**
     * Set multiple values
     */
    async mset(entries) {
        try {
            const pipeline = this.redis.pipeline();
            for (const { key, value, options = {} } of entries) {
                const serialized = JSON.stringify(value);
                if (options.ttl && options.ttl > 0) {
                    pipeline.setex(key, options.ttl, serialized);
                }
                else {
                    pipeline.set(key, serialized);
                }
                if (options.tags && options.tags.length > 0) {
                    pipeline.sadd(`tag:${options.tags[0]}`, key);
                }
            }
            await pipeline.exec();
        }
        catch (error) {
            console.error('Cache mset error:', error);
        }
    }
    /**
     * Search cache by pattern
     */
    async search(pattern) {
        try {
            return await this.redis.keys(pattern);
        }
        catch (error) {
            console.error('Cache search error:', error);
            return [];
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            size: this.localCache.size
        };
    }
    /**
     * Clear all cache
     */
    async clear() {
        try {
            await this.redis.flushdb();
            this.localCache.clear();
            this.stats = {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                size: 0
            };
        }
        catch (error) {
            console.error('Cache clear error:', error);
        }
    }
    /**
     * Generate cache key with namespace
     */
    static generateKey(namespace, identifier, params) {
        const base = `${namespace}:${identifier}`;
        if (!params)
            return base;
        const paramStr = JSON.stringify(params, Object.keys(params).sort());
        const hash = (0, crypto_1.createHash)('md5').update(paramStr).digest('hex').substring(0, 8);
        return `${base}:${hash}`;
    }
    // Private methods
    getFromLocal(key) {
        const item = this.localCache.get(key);
        if (!item)
            return null;
        if (Date.now() > item.expiry) {
            this.localCache.delete(key);
            return null;
        }
        return item.value;
    }
    setToLocal(key, value, ttlSeconds) {
        // Limit local cache size
        if (this.localCache.size > 1000) {
            // Remove oldest entries
            const entries = Array.from(this.localCache.entries());
            entries.sort((a, b) => a[1].expiry - b[1].expiry);
            const toRemove = entries.slice(0, 200);
            toRemove.forEach(([k]) => this.localCache.delete(k));
        }
        this.localCache.set(key, {
            value,
            expiry: Date.now() + (ttlSeconds * 1000)
        });
    }
    cleanupLocalCache() {
        const now = Date.now();
        for (const [key, item] of this.localCache.entries()) {
            if (now > item.expiry) {
                this.localCache.delete(key);
            }
        }
        this.stats.size = this.localCache.size;
    }
    async addToTags(key, tags) {
        const pipeline = this.redis.pipeline();
        for (const tag of tags) {
            pipeline.sadd(`tag:${tag}`, key);
        }
        await pipeline.exec();
    }
}
exports.CacheService = CacheService;
// Singleton instance
exports.cacheService = new CacheService();
// Cache decorators
function Cacheable(options = {}) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const key = CacheService.generateKey(target.constructor.name, propertyName, { args });
            return await exports.cacheService.getOrSet(key, () => method.apply(this, args), options);
        };
    };
}
function CacheInvalidate(tags) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const result = await method.apply(this, args);
            await exports.cacheService.deleteByTags(tags);
            return result;
        };
    };
}
exports.default = exports.cacheService;
//# sourceMappingURL=cache.service.js.map