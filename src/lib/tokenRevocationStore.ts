import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { logger } from './logger';

const RUNTIME_DIR = path.resolve(process.cwd(), '.runtime');
const FILE_PATH = path.join(RUNTIME_DIR, 'tokenRevocation.json');

export async function ensureRuntimeDir() {
  try {
    await fs.mkdir(RUNTIME_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }
}

async function getRevokedAtFile(): Promise<number | null> {
  try {
    const content = await fs.readFile(FILE_PATH, 'utf8');
    const json = JSON.parse(content);
    if (typeof json.revokedAt === 'number') return json.revokedAt;
    return null;
  } catch (err) {
    return null;
  }
}

async function setRevokedAtFile(ts: number): Promise<void> {
  await ensureRuntimeDir();
  const json = { revokedAt: ts };
  await fs.writeFile(FILE_PATH, JSON.stringify(json, null, 2), { encoding: 'utf8' });
}

// Exported functions that choose Redis at runtime when available
export async function getRevokedAt(): Promise<number | null> {
  if (env.REDIS_URL) {
    try {
      const { getRevokedAtRedis } = await import('./tokenRevocationRedis');
      return await getRevokedAtRedis();
    } catch (err) {
      console.error('Falha ao ler revogação via Redis, caindo para arquivo local', err);
      return getRevokedAtFile();
    }
  }
  if (!env.REDIS_URL && env.NODE_ENV === 'production') {
    logger.warn('[auth] REDIS_URL não configurada. Usando armazenamento local para revogação, o que não é recomendado para ambientes multi-instância.');
  }
  return getRevokedAtFile();
}

export async function setRevokedAt(ts: number): Promise<void> {
  if (env.REDIS_URL) {
    try {
      const { setRevokedAtRedis } = await import('./tokenRevocationRedis');
      return await setRevokedAtRedis(ts);
    } catch (err) {
      console.error('Falha ao escrever revogação via Redis, caindo para arquivo local', err);
      return setRevokedAtFile(ts);
    }
  }
  return setRevokedAtFile(ts);
}
