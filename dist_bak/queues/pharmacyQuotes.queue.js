"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pharmacyQuotesQueue = exports.PHARMACY_QUOTES_QUEUE_NAME = void 0;
exports.getPharmacyQuotesQueue = getPharmacyQuotesQueue;
const bullmq_1 = require("bullmq");
const pedomed_config_js_1 = require("../config/pedomed.config.js");
const env_js_1 = require("../config/env.js");
const redis_js_1 = require("../lib/redis.js");
exports.PHARMACY_QUOTES_QUEUE_NAME = pedomed_config_js_1.PEDOMED_CONFIG.QUEUE.NAME;
let _queue = null;
function getPharmacyQuotesQueue() {
    if (!_queue && env_js_1.env.REDIS_URL) {
        const connection = (0, redis_js_1.getBullMQConnection)();
        _queue = new bullmq_1.Queue(exports.PHARMACY_QUOTES_QUEUE_NAME, {
            connection: connection,
            defaultJobOptions: {
                removeOnComplete: pedomed_config_js_1.PEDOMED_CONFIG.QUEUE.REMOVE_ON_COMPLETE,
                removeOnFail: pedomed_config_js_1.PEDOMED_CONFIG.QUEUE.REMOVE_ON_FAIL,
                attempts: pedomed_config_js_1.PEDOMED_CONFIG.QUEUE.MAX_RETRIES,
                backoff: pedomed_config_js_1.PEDOMED_CONFIG.QUEUE.RETRY_BACKOFF,
            },
        });
    }
    return _queue;
}
/**
 * pharmacyQuotesQueue
 * Exportação reativa para compatibilidade
 */
exports.pharmacyQuotesQueue = {
    add: async (name, data, options) => {
        const queue = getPharmacyQuotesQueue();
        if (!queue)
            throw new Error('Redis not configured, cannot add to queue');
        return queue.add(name, data, options);
    }
};
//# sourceMappingURL=pharmacyQuotes.queue.js.map