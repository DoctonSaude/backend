import { Redis } from 'ioredis';
import { env } from '../config/env.js';

let client: Redis | null = null;
let bullmqClient: Redis | null = null;

function createClient(url: string | undefined, options: any = {}): Redis | null {
    if (!url || url.trim() === '') {
        return null;
    }
    const c = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
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
            console.error('Failed to create BullMQ Redis connection:', error);
            return null;
        }
    }
    return bullmqClient;
}
