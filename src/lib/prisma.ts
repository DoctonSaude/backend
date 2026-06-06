import { PrismaClient } from '../../lib/generated/prisma/index.js';
import 'dotenv/config';

import { logger } from './logger.js';

const getDatabaseUrl = () => {
  let url = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL) as string;
  if (url) {
    // Mantendo a conexão via pooler (6543) com pgbouncer=true recomendado pelo Supabase/Prisma
    
    // Remove duplicate params if any
    url = url.replace('&&', '&').replace('?&', '?');

    // Log sem credenciais
    const obfuscatedUrl = url.replace(/:([^@]+)@/, ':****@');
    logger.info(`Initializating Prisma with DB: ${obfuscatedUrl}`);

    if (!url.includes('connect_timeout')) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}connect_timeout=30&pool_timeout=30&connection_limit=15`;
    } else {
      // Garantir que os limites de conexões e pool timeout estejam presentes
        url = `${url}&connection_limit=15`;
      if (!url.includes('pool_timeout')) {
        url = `${url}&pool_timeout=30`;
      }
    }
  } else {
    logger.warn('DATABASE_URL is not defined in environment!');
  }
  return url;
};

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: { url: getDatabaseUrl() },
  },
});

export default prisma;
