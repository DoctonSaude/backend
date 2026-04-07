import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

import { logger } from './logger.js';

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL as string;
  if (url) {
    // Log sem credenciais
    const obfuscatedUrl = url.replace(/:([^@]+)@/, ':****@');
    logger.info(`Initializating Prisma with DB: ${obfuscatedUrl}`);

    if (!url.includes('connect_timeout')) {
      return url.includes('?') ? `${url}&connect_timeout=10` : `${url}?connect_timeout=10`;
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
