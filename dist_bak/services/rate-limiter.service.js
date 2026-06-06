"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiterService = exports.RATE_LIMITS = exports.RateLimiterService = void 0;
const redis_js_1 = require("../lib/redis.js");
class RateLimiterService {
    redis;
    windows = new Map();
    constructor() {
        this.redis = (0, redis_js_1.getRedisClient)();
    }
    /**
     * Register a rate limit window
     */
    registerWindow(name, config) {
        this.windows.set(name, {
            ...config,
            keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
            message: config.message || 'Too many requests'
        });
    }
    /**
     * Check if request is allowed
     */
    async checkLimit(windowName, req) {
        const config = this.windows.get(windowName);
        if (!config) {
            throw new Error(`Rate limit window '${windowName}' not found`);
        }
        const key = config.keyGenerator(req);
        const now = Date.now();
        const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
        const windowEnd = windowStart + config.windowMs;
        const resetTime = windowEnd;
        try {
            if (!this.redis)
                return { allowed: true, remaining: config.max, resetTime, total: config.max };
            // Use Redis atomic operations for rate limiting
            const pipeline = this.redis.pipeline();
            // Remove old entries
            pipeline.zremrangebyscore(key, 0, windowStart - 1);
            // Count current requests
            pipeline.zcard(key);
            // Add current request
            pipeline.zadd(key, now, `${now}-${Math.random()}`);
            // Set expiry
            pipeline.expire(key, Math.ceil(config.windowMs / 1000));
            const results = await pipeline.exec();
            const currentCount = results?.[1]?.[1] || 0;
            const allowed = currentCount <= config.max;
            const remaining = Math.max(0, config.max - currentCount);
            // const resetTime = windowEnd (already declared above)
            // Call callback if limit reached
            if (!allowed) {
                console.warn(`[rate-limit] Limite atingido na janela '${windowName}': ${key}. Requisitante bloqueado até ${new Date(resetTime).toLocaleTimeString()}`);
                if (config.onLimitReached) {
                    config.onLimitReached(req, null);
                }
            }
            return {
                allowed,
                remaining,
                resetTime,
                total: config.max,
                retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000)
            };
        }
        catch (error) {
            console.error('Rate limiter error:', error);
            // Fail open - allow request if Redis is down
            return {
                allowed: true,
                remaining: 1,
                resetTime: now + config.windowMs,
                total: config.max
            };
        }
    }
    /**
     * Get current usage statistics
     */
    async getUsage(windowName, req) {
        const config = this.windows.get(windowName);
        if (!config) {
            throw new Error(`Rate limit window '${windowName}' not found`);
        }
        const key = config.keyGenerator(req);
        const now = Date.now();
        const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
        try {
            if (!this.redis) {
                return {
                    used: 0,
                    remaining: config.max,
                    resetTime: windowStart + config.windowMs,
                    total: config.max
                };
            }
            // Remove old entries and count current
            const pipeline = this.redis.pipeline();
            pipeline.zremrangebyscore(key, 0, windowStart - 1);
            pipeline.zcard(key);
            const results = await pipeline.exec();
            const used = results?.[1]?.[1] || 0;
            return {
                used,
                remaining: Math.max(0, config.max - used),
                resetTime: windowStart + config.windowMs,
                total: config.max
            };
        }
        catch (error) {
            console.error('Rate limiter usage error:', error);
            return {
                used: 0,
                remaining: config.max,
                resetTime: now + config.windowMs,
                total: config.max
            };
        }
    }
    /**
     * Reset rate limit for a specific key
     */
    async reset(windowName, req) {
        const config = this.windows.get(windowName);
        if (!config) {
            throw new Error(`Rate limit window '${windowName}' not found`);
        }
        const key = config.keyGenerator(req);
        if (this.redis)
            await this.redis.del(key);
    }
    /**
     * Create Express middleware
     */
    middleware(windowName) {
        return async (req, res, next) => {
            const config = this.windows.get(windowName);
            if (!config) {
                return next();
            }
            try {
                const result = await this.checkLimit(windowName, req);
                // Add headers if enabled
                if (config.headers) {
                    res.set({
                        'X-RateLimit-Limit': result.total,
                        'X-RateLimit-Remaining': result.remaining,
                        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
                    });
                    if (result.retryAfter) {
                        res.set('Retry-After', result.retryAfter.toString());
                    }
                }
                if (!result.allowed) {
                    const message = typeof config.message === 'function'
                        ? config.message(req)
                        : config.message;
                    return res.status(429).json({
                        error: 'Rate limit exceeded',
                        message,
                        retryAfter: result.retryAfter,
                        limit: result.total,
                        remaining: result.remaining,
                        resetTime: result.resetTime
                    });
                }
                next();
            }
            catch (error) {
                console.error('Rate limiter middleware error:', error);
                next(); // Fail open
            }
        };
    }
    /**
     * Advanced rate limiting with multiple windows
     */
    async checkMultipleLimits(checks) {
        const promises = checks.map(async ({ windowName, req }) => {
            const result = await this.checkLimit(windowName, req);
            return { windowName, result };
        });
        return Promise.all(promises);
    }
    /**
     * Sliding window rate limiting
     */
    async checkSlidingWindow(windowName, req, windowMs, maxRequests) {
        const config = this.windows.get(windowName);
        const key = config?.keyGenerator ? config.keyGenerator(req) : this.defaultKeyGenerator(req);
        const now = Date.now();
        const windowStart = now - windowMs;
        try {
            if (!this.redis) {
                return {
                    allowed: true,
                    remaining: maxRequests,
                    resetTime: now + windowMs,
                    total: maxRequests
                };
            }
            const pipeline = this.redis.pipeline();
            // Remove entries outside the sliding window
            pipeline.zremrangebyscore(key, 0, windowStart);
            // Count current requests in the window
            pipeline.zcard(key);
            // Add current request
            pipeline.zadd(key, now, `${now}-${Math.random()}`);
            // Set expiry
            pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);
            const results = await pipeline.exec();
            const currentCount = results?.[1]?.[1] || 0;
            const allowed = currentCount <= maxRequests;
            const remaining = Math.max(0, maxRequests - currentCount);
            return {
                allowed,
                remaining,
                resetTime: now + windowMs,
                total: maxRequests,
                retryAfter: allowed ? undefined : Math.ceil(windowMs / 1000)
            };
        }
        catch (error) {
            console.error('Sliding window rate limiter error:', error);
            return {
                allowed: true,
                remaining: maxRequests,
                resetTime: now + windowMs,
                total: maxRequests
            };
        }
    }
    /**
     * Token bucket rate limiting
     */
    async checkTokenBucket(windowName, req, capacity, refillRate // tokens per second
    ) {
        const config = this.windows.get(windowName);
        const key = config?.keyGenerator ? config.keyGenerator(req) : this.defaultKeyGenerator(req);
        const now = Date.now();
        try {
            if (!this.redis)
                return { allowed: true, remaining: capacity, resetTime: now + 1000, total: capacity };
            const script = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local capacity = tonumber(ARGV[2])
        local refill_rate = tonumber(ARGV[3])
        local tokens_requested = tonumber(ARGV[4])
        
        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now
        
        -- Refill tokens
        local time_passed = now - last_refill
        local tokens_to_add = time_passed * refill_rate / 1000
        tokens = math.min(capacity, tokens + tokens_to_add)
        
        -- Check if enough tokens
        if tokens >= tokens_requested then
          tokens = tokens - tokens_requested
          redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
          redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 1)
          return {1, tokens, capacity}
        else
          redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
          redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 1)
          return {0, tokens, capacity}
        end
      `;
            const result = await this.redis.eval(script, 1, key, now, capacity, refillRate, 1);
            const [allowed, tokens] = result;
            return {
                allowed: allowed === 1,
                remaining: Math.floor(tokens),
                resetTime: now + Math.ceil((capacity - tokens) / refillRate * 1000),
                total: capacity
            };
        }
        catch (error) {
            console.error('Token bucket rate limiter error:', error);
            return {
                allowed: true,
                remaining: capacity,
                resetTime: now + 1000,
                total: capacity
            };
        }
    }
    defaultKeyGenerator(req) {
        // Use IP address as default key
        const ip = req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection?.socket?.remoteAddress ||
            'unknown';
        return `rate_limit:${ip}`;
    }
}
exports.RateLimiterService = RateLimiterService;
// Predefined rate limit configurations
exports.RATE_LIMITS = {
    // General API limits
    API: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000,
        headers: true,
        message: 'Too many API requests'
    },
    // Strict limits for expensive operations
    OCR: {
        windowMs: 60 * 1000, // 1 minute
        max: 10,
        headers: true,
        message: 'OCR processing limit exceeded'
    },
    // Payment processing limits
    PAYMENTS: {
        windowMs: 60 * 1000, // 1 minute
        max: 5,
        headers: true,
        message: 'Payment processing limit exceeded'
    },
    // Search limits
    SEARCH: {
        windowMs: 60 * 1000, // 1 minute
        max: 100,
        headers: true,
        message: 'Search limit exceeded'
    },
    // Upload limits
    UPLOAD: {
        windowMs: 60 * 1000, // 1 minute
        max: 20,
        headers: true,
        message: 'Upload limit exceeded'
    },
    // Authentication limits
    AUTH: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20,
        headers: true,
        message: 'Authentication limit exceeded'
    }
};
// Singleton instance
exports.rateLimiterService = new RateLimiterService();
// Register predefined limits
Object.entries(exports.RATE_LIMITS).forEach(([name, config]) => {
    exports.rateLimiterService.registerWindow(name, config);
});
exports.default = exports.rateLimiterService;
//# sourceMappingURL=rate-limiter.service.js.map