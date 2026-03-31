"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
// Este serviço é usado no backend para chamar outras APIs.
// Evita o uso de APIs de browser como import.meta.env e localStorage.
const baseURL = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';
const api = axios_1.default.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Adiciona um interceptor para incluir o token JWT das variáveis de ambiente (quando existir)
api.interceptors.request.use((config) => {
    const globalAny = global;
    const tokenFromGlobal = globalAny?.localStorage?.getItem?.('@DoctonSaude:token');
    const tokenFromEnv = process.env.BACKEND_API_TOKEN;
    const token = tokenFromGlobal || tokenFromEnv;
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
exports.default = api;
//# sourceMappingURL=api.js.map