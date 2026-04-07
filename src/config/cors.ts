import { env } from './env.js';

export const allowedOrigins = [
  'https://app.docton.com.br',
  'https://admin.docton.com.br',
  'https://parceiro.docton.com.br',
  'https://docton.com.br',
  'https://api.docton.com.br',
  'https://doctonsaude.com.br',
  'https://docton-website.vercel.app',
  'http://app.docton.com.br',
  'http://api.docton.com.br',
];

// Regex para permitir qualquer subdomínio dos domínios oficiais (docton.com.br e doctonsaude.com.br)
const officialDomainRegex = /https?:\/\/([a-z0-9-]+\.)?(docton\.com\.br|doctonsaude\.com\.br)(\/|$)/;

/**
 * Função para verificar se a origem é permitida
 */
export const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Permite mobile apps/curl

  // 1. Verifica na lista estática
  if (allowedOrigins.includes(origin)) return true;

  // 2. Verifica via Regex de subdomínios (Robusto para produção)
  if (officialDomainRegex.test(origin)) return true;

  // 3. Permitir localhost sempre para testes de desenvolvimento/homologação
  const isLocal = /^https?:\/\/localhost:\d+/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+/.test(origin);
  if (isLocal) return true;

  // 4. Origens extras via ENV
  try {
    if (env.CORS_ORIGIN) {
      const origins = env.CORS_ORIGIN.split(',');
      if (origins.includes(origin)) return true;
    }
  } catch (e) {}

  return false;
};

console.log(`[CORS] Sistema de proteção de origens inicializado com Regex.`);
