"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.getBullMQConnection = getBullMQConnection;
const ioredis_1 = require("ioredis");
const env_js_1 = require("../config/env.js");
let client = null;
let bullmqClient = null;
function createClient(url, options = {}) {
    if (!url || url.trim() === '') {
        return null;
    }
    const c = new ioredis_1.Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
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
            console.error('Failed to create BullMQ Redis connection:', error);
            return null;
        }
    }
    return bullmqClient;
}
//# sourceMappingURL=redis.js.map