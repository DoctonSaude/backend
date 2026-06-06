import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let client: Redis | null = null;
let bullmqClient: Redis | null = null;

function createClient(url: string | undefined, options: any = {}): Redis | null {
    if (!url || url.trim() === '') {
        return null;
    }
    const c = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000, // 5 seconds timeout
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

    return c;
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
