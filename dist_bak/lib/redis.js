"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.getBullMQConnection = getBullMQConnection;
exports.checkRedisHealth = checkRedisHealth;
const ioredis_1 = require("ioredis");
const env_js_1 = require("../config/env.js");
const logger_js_1 = require("./logger.js");
let client = null;
let bullmqClient = null;
function createClient(url, options = {}) {
    if (!url || url.trim() === '') {
        return null;
    }
    const c = new ioredis_1.Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000, // 5 seconds timeout
        ...options
    });
    c.on('error', (err) => {
        // Just log, don't crash
        if (env_js_1.env.NODE_ENV === 'development') {
            // Keep it quiet in dev logs if it's just a connection failure
            if (err.code !== 'ECONNREFUSED') {
                console.error('Redis Error:', err.message);
            }
        }
        else {
            console.error('Redis Error:', err);
        }
    });
    return c;
}
function getRedisClient() {
    if (!env_js_1.env.REDIS_URL) {
        return null;
    }
    if (!client) {
        client = createClient(env_js_1.env.REDIS_URL);
    }
    return client;
}
function getBullMQConnection() {
    if (!env_js_1.env.REDIS_URL || env_js_1.env.REDIS_URL.trim() === '') {
        return null;
    }
    if (!bullmqClient) {
        try {
            bullmqClient = createClient(env_js_1.env.REDIS_URL, {
                maxRetriesPerRequest: null,
            });
        }
        catch (error) {
            logger_js_1.logger.error('Failed to create BullMQ Redis connection:', error);
            return null;
        }
    }
    return bullmqClient;
}
/**
 * Pings Redis to check if it's alive and reachable
 */
async function checkRedisHealth() {
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
    }
    catch (error) {
        return { status: 'down', message: error.message };
    }
}
//# sourceMappingURL=redis.js.map