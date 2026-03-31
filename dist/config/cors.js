"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedOrigins = void 0;
const env_js_1 = require("./env.js");
exports.allowedOrigins = [
    'https://app.docton.com.br',
    'https://admin.docton.com.br',
    'https://parceiro.docton.com.br',
    'https://docton.com.br',
    'https://doctonsaude.com.br',
    'https://docton-website.vercel.app',
    'http://app.docton.com.br',
];
// Adicionar origens extras via variável de ambiente (sem crashar se mal formatada)
try {
    if (env_js_1.env.CORS_ORIGIN) {
        env_js_1.env.CORS_ORIGIN.split(',').forEach(origin => {
            const trimmed = origin.trim();
            if (trimmed && !exports.allowedOrigins.includes(trimmed)) {
                exports.allowedOrigins.push(trimmed);
            }
        });
    }
}
catch {
    console.warn('[CORS] Falha ao processar CORS_ORIGIN do .env — usando apenas origens padrão.');
}
// Em desenvolvimento, permitir localhost
if (process.env.NODE_ENV !== 'production') {
    exports.allowedOrigins.push('http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001');
}
console.log(`[CORS] ${exports.allowedOrigins.length} origens permitidas inicializadas.`);
//# sourceMappingURL=cors.js.map