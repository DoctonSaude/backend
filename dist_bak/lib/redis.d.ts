import { Redis } from 'ioredis';
export declare function getRedisClient(): Redis | null;
export declare function getBullMQConnection(): Redis | null;
/**
 * Pings Redis to check if it's alive and reachable
 */
export declare function checkRedisHealth(): Promise<{
    status: 'up' | 'down';
    message?: string;
}>;
//# sourceMappingURL=redis.d.ts.map