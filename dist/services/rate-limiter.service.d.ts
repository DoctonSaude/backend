import { Request } from 'express';
interface RateLimitConfig {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    message?: string | ((req: Request) => string);
    headers?: boolean;
    onLimitReached?: (req: Request, res: any) => void;
}
interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    total: number;
    retryAfter?: number;
}
export declare class RateLimiterService {
    private redis;
    private windows;
    constructor();
    /**
     * Register a rate limit window
     */
    registerWindow(name: string, config: RateLimitConfig): void;
    /**
     * Check if request is allowed
     */
    checkLimit(windowName: string, req: Request): Promise<RateLimitResult>;
    /**
     * Get current usage statistics
     */
    getUsage(windowName: string, req: Request): Promise<{
        used: number;
        remaining: number;
        resetTime: number;
        total: number;
    }>;
    /**
     * Reset rate limit for a specific key
     */
    reset(windowName: string, req: Request): Promise<void>;
    /**
     * Create Express middleware
     */
    middleware(windowName: string): (req: Request, res: any, next: Function) => Promise<any>;
    /**
     * Advanced rate limiting with multiple windows
     */
    checkMultipleLimits(checks: Array<{
        windowName: string;
        req: Request;
    }>): Promise<{
        windowName: string;
        result: RateLimitResult;
    }[]>;
    /**
     * Sliding window rate limiting
     */
    checkSlidingWindow(windowName: string, req: Request, windowMs: number, maxRequests: number): Promise<RateLimitResult>;
    /**
     * Token bucket rate limiting
     */
    checkTokenBucket(windowName: string, req: Request, capacity: number, refillRate: number): Promise<RateLimitResult>;
    private defaultKeyGenerator;
}
export declare const RATE_LIMITS: {
    API: {
        windowMs: number;
        max: number;
        headers: boolean;
        message: string;
    };
    OCR: {
        windowMs: number;
        max: number;
        headers: boolean;
        message: string;
    };
    PAYMENTS: {
        windowMs: number;
        max: number;
        headers: boolean;
        message: string;
    };
    SEARCH: {
        windowMs: number;
        max: number;
        headers: boolean;
        message: string;
    };
    UPLOAD: {
        windowMs: number;
        max: number;
        headers: boolean;
        message: string;
    };
    AUTH: {
        windowMs: number;
        max: number;
        headers: boolean;
        message: string;
    };
};
export declare const rateLimiterService: RateLimiterService;
export default rateLimiterService;
//# sourceMappingURL=rate-limiter.service.d.ts.map