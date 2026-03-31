import { getRedisClient } from './redis.js';

function getClient() {
  const client = getRedisClient();
  if (!client) throw new Error('REDIS_URL not configured');
  return client;
}

const KEY = 'app:tokenRevocation:revokedAt';

export async function getRevokedAtRedis(): Promise<number | null> {
  try {
    const c = getClient();
    const val = await c.get(KEY);
    if (!val) return null;
    const ts = Number(val);
    return Number.isFinite(ts) ? ts : null;
  } catch (err) {
    console.error('Redis read error', err);
    return null;
  }
}

export async function setRevokedAtRedis(ts: number): Promise<void> {
  const c = getClient();
  await c.set(KEY, String(ts));
}
