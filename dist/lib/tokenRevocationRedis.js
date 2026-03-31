"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRevokedAtRedis = getRevokedAtRedis;
exports.setRevokedAtRedis = setRevokedAtRedis;
const redis_js_1 = require("./redis.js");
function getClient() {
    const client = (0, redis_js_1.getRedisClient)();
    if (!client)
        throw new Error('REDIS_URL not configured');
    return client;
}
const KEY = 'app:tokenRevocation:revokedAt';
async function getRevokedAtRedis() {
    try {
        const c = getClient();
        const val = await c.get(KEY);
        if (!val)
            return null;
        const ts = Number(val);
        return Number.isFinite(ts) ? ts : null;
    }
    catch (err) {
        console.error('Redis read error', err);
        return null;
    }
}
async function setRevokedAtRedis(ts) {
    const c = getClient();
    await c.set(KEY, String(ts));
}
//# sourceMappingURL=tokenRevocationRedis.js.map