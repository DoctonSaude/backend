import axios from 'axios';

// Este serviço é usado no backend para chamar outras APIs.
// Evita o uso de APIs de browser como import.meta.env e localStorage.

const baseURL = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adiciona um interceptor para incluir o token JWT das variáveis de ambiente (quando existir)
api.interceptors.request.use((config) => {
  const globalAny = global as any;
  const tokenFromGlobal = globalAny?.localStorage?.getItem?.('@DoctonSaude:token');
  const tokenFromEnv = process.env.BACKEND_API_TOKEN;
  const token = tokenFromGlobal || tokenFromEnv;

  if (token) {
    (config as any).headers = (config as any).headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;