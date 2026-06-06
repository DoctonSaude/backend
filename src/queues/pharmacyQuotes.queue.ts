import { Queue } from 'bullmq';
import { PEDOMED_CONFIG } from '../config/pedomed.config.js';
import { env } from '../config/env.js';
import { getBullMQConnection } from '../lib/redis.js';

export const PHARMACY_QUOTES_QUEUE_NAME = PEDOMED_CONFIG.QUEUE.NAME;

let _queue: Queue | null = null;

export function getPharmacyQuotesQueue(): Queue | null {
    if (!_queue && env.REDIS_URL) {
        const connection = getBullMQConnection();
        _queue = new Queue(PHARMACY_QUOTES_QUEUE_NAME, {
            connection: connection as any,
            defaultJobOptions: {
                removeOnComplete: PEDOMED_CONFIG.QUEUE.REMOVE_ON_COMPLETE,
                removeOnFail: PEDOMED_CONFIG.QUEUE.REMOVE_ON_FAIL,
                attempts: PEDOMED_CONFIG.QUEUE.MAX_RETRIES,
                backoff: PEDOMED_CONFIG.QUEUE.RETRY_BACKOFF,
            },
        });
    }
    return _queue;
}

/**
 * pharmacyQuotesQueue
 * Exportação reativa para compatibilidade
 */
export const pharmacyQuotesQueue = {
    add: async (name: string, data: any, options: any) => {
        const queue = getPharmacyQuotesQueue();
        if (!queue) throw new Error('Redis not configured, cannot add to queue');
        return queue.add(name, data, options);
    }
} as any;
