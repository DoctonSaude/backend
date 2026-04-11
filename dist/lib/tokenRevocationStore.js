"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureRuntimeDir = ensureRuntimeDir;
exports.getRevokedAt = getRevokedAt;
exports.setRevokedAt = setRevokedAt;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
const logger_1 = require("./logger");
const RUNTIME_DIR = path_1.default.resolve(process.cwd(), '.runtime');
const FILE_PATH = path_1.default.join(RUNTIME_DIR, 'tokenRevocation.json');
async function ensureRuntimeDir() {
    try {
        await promises_1.default.mkdir(RUNTIME_DIR, { recursive: true });
    }
    catch (err) {
        // ignore
    }
}
async function getRevokedAtFile() {
    try {
        const content = await promises_1.default.readFile(FILE_PATH, 'utf8');
        const json = JSON.parse(content);
        if (typeof json.revokedAt === 'number')
            return json.revokedAt;
        return null;
    }
    catch (err) {
        return null;
    }
}
async function setRevokedAtFile(ts) {
    await ensureRuntimeDir();
    const json = { revokedAt: ts };
    await promises_1.default.writeFile(FILE_PATH, JSON.stringify(json, null, 2), { encoding: 'utf8' });
}
// Exported functions that choose Redis at runtime when available
async function getRevokedAt() {
    if (env_1.env.REDIS_URL) {
        try {
            const { getRevokedAtRedis } = await Promise.resolve().then(() => __importStar(require('./tokenRevocationRedis')));
            return await getRevokedAtRedis();
        }
        catch (err) {
            console.error('Falha ao ler revogação via Redis, caindo para arquivo local', err);
            return getRevokedAtFile();
        }
    }
    if (!env_1.env.REDIS_URL && env_1.env.NODE_ENV === 'production') {
        logger_1.logger.warn('[auth] REDIS_URL não configurada. Usando armazenamento local para revogação, o que não é recomendado para ambientes multi-instância.');
    }
    return getRevokedAtFile();
}
async function setRevokedAt(ts) {
    if (env_1.env.REDIS_URL) {
        try {
            const { setRevokedAtRedis } = await Promise.resolve().then(() => __importStar(require('./tokenRevocationRedis')));
            return await setRevokedAtRedis(ts);
        }
        catch (err) {
            console.error('Falha ao escrever revogação via Redis, caindo para arquivo local', err);
            return setRevokedAtFile(ts);
        }
    }
    return setRevokedAtFile(ts);
}
//# sourceMappingURL=tokenRevocationStore.js.map