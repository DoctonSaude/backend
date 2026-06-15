import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let client: Redis | null = null;
let bullmqClient: Redis | null = null;

function createClient(url: string | undefined, options: any = {}): Redis | null {
    if (!url || url.trim() === '') {
        console.log('ℹ️  Redis URL not configured - Redis disabled');
        return null;
    }
    
    try {
        const c = new Redis(url, {
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            connectTimeout: 5000, // 5 seconds timeout
            retryStrategy: (times) => {
                if (times > 3) {
                    console.warn('⚠️  Redis connection failed after 3 retries - operating without Redis');
                    return null; // Stop retrying
                }
                return Math.min(times * 100, 3000);
            },
            ...options
        });

        c.on('error', (err) => {
            // Just log, don't crash
            if (env.NODE_ENV === 'development') {
                // Keep it quiet in dev logs if it's just a connection failure
                if ((err as any).code !== 'ECONNREFUSED') {
                    console.error('Redis Error:', err.message);
                }
            } else {
                console.error('Redis Error:', err);
            }
        });

        c.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });

        return c;
    } catch (error) {
        console.error('Failed to create Redis client:', error);
        return null;
    }
}

export function getRedisClient(): Redis | null {
    if (!env.REDIS_URL) {
        return null;
    }
    if (!client) {
        client = createClient(env.REDIS_URL);
    }
    return client;
}

export function getBullMQConnection(): Redis | null {
    if (!env.REDIS_URL || env.REDIS_URL.trim() === '') {
        return null;
    }
    if (!bullmqClient) {
        try {
            bullmqClient = createClient(env.REDIS_URL, {
                maxRetriesPerRequest: null,
            });
        } catch (error) {
            logger.error('Failed to create BullMQ Redis connection:', error);
            return null;
        }
    }
    return bullmqClient;
}

/**
 * Pings Redis to check if it's alive and reachable
 */
export async function checkRedisHealth(): Promise<{ status: 'up' | 'down'; message?: string }> {
    const redis = getRedisClient();
    if (!redis) {
        return { status: 'down', message: 'REDIS_URL not configured' };
    }

    try {
        // Try PING with a 2s timeout
        const result = await Promise.race([
            redis.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis PING timeout')), 2000))
        ]);

        if (result === 'PONG') {
            return { status: 'up' };
        }
        return { status: 'down', message: 'Unexpected response from Redis' };
    } catch (error: any) {
        return { status: 'down', message: error.message };
    }
}
