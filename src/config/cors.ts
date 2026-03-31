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

// Adicionar origens extras via variável de ambiente (sem crashar se mal formatada)
try {
  if (env.CORS_ORIGIN) {
    env.CORS_ORIGIN.split(',').forEach(origin => {
      const trimmed = origin.trim();
      if (trimmed && !allowedOrigins.includes(trimmed)) {
        allowedOrigins.push(trimmed);
      }
    });
  }
} catch {
  console.warn('[CORS] Falha ao processar CORS_ORIGIN do .env — usando apenas origens padrão.');
}

// Em desenvolvimento, permitir localhost
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:3001'
  );
}

console.log(`[CORS] ${allowedOrigins.length} origens permitidas inicializadas.`);
