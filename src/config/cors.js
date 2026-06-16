"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOriginAllowed = exports.allowedOrigins = void 0;
var env_js_1 = require("./env.js");
exports.allowedOrigins = [
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
var officialDomainRegex = /https?:\/\/([a-z0-9-]+\.)?(docton\.com\.br|doctonsaude\.com\.br)(\/|$)/;
/**
 * Função para verificar se a origem é permitida
 */
var isOriginAllowed = function (origin) {
    if (!origin)
        return true; // Permite mobile apps/curl
    // 1. Verifica na lista estática
    if (exports.allowedOrigins.includes(origin))
        return true;
    // 2. Verifica via Regex de subdomínios (Robusto para produção)
    if (officialDomainRegex.test(origin))
        return true;
    // 3. Permitir localhost sempre para testes de desenvolvimento/homologação
    var isLocal = /^https?:\/\/localhost:\d+/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+/.test(origin);
    if (isLocal)
        return true;
    // 4. Origens extras via ENV
    try {
        if (env_js_1.env.CORS_ORIGIN) {
            var origins = env_js_1.env.CORS_ORIGIN.split(',');
            if (origins.includes(origin))
                return true;
        }
    }
    catch (e) { }
    return false;
};
exports.isOriginAllowed = isOriginAllowed;
console.log("[CORS] Sistema de prote\u00E7\u00E3o de origens inicializado com Regex.");
