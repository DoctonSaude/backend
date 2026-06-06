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
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const crypto = __importStar(require("crypto"));
/**
 * Schema de validação para variáveis de ambiente
 * Garante que todas as configurações críticas estejam presentes e válidas
 */
const envSchema = zod_1.z.object({
    // Servidor
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().min(1).max(65535).default(3001),
    // CORS
    CORS_ORIGIN: zod_1.z.string().optional(),
    // JWT - CRÍTICO: Deve ser forte em produção
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    // Database
    DATABASE_URL: zod_1.z.string().min(1),
    // Redis (opcional): se definido, será usado para revogação de tokens
    REDIS_URL: zod_1.z.string().transform(v => v === '' ? undefined : v).optional(),
    // Supabase
    SUPABASE_URL: zod_1.z.string().transform(v => v === '' ? undefined : v).optional(),
    SUPABASE_ANON_KEY: zod_1.z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional(),
    // Email
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().transform(Number).pipe(zod_1.z.number()).optional(),
    SMTP_USER: zod_1.z.string().email().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    FROM_EMAIL: zod_1.z.string().email().optional(),
    FROM_NAME: zod_1.z.string().optional(),
    // Push Notifications
    VAPID_PUBLIC_KEY: zod_1.z.string().optional(),
    VAPID_PRIVATE_KEY: zod_1.z.string().optional(),
    VAPID_SUBJECT: zod_1.z.string().refine(val => val.startsWith('mailto:') || val.includes('@'), {
        message: "VAPID_SUBJECT deve ser um e-mail válido ou começar com 'mailto:'"
    }).optional(),
    // Cron Jobs
    ENABLE_CRON_JOBS: zod_1.z.string().transform(val => val === 'true').default('true'),
    // Logs
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).pipe(zod_1.z.number()).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).pipe(zod_1.z.number()).default('1000'), // Increased for dev
    AUTH_RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).pipe(zod_1.z.number()).default('50'), // Increased for dev
    // Security
    BCRYPT_ROUNDS: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(10).max(15)).default('12'),
    ADMIN_DEV_BYPASS: zod_1.z.string().transform(val => val === 'true').default('true'),
    ADMIN_DEV_USER_ID: zod_1.z.string().default('admin-dev'),
    // OpenAI
    OPENAI_API_KEY: zod_1.z.string().optional(),
});
/**
 * Gera um JWT secret forte se não existir
 */
function generateSecureJWTSecret() {
    return crypto.randomBytes(64).toString('hex');
}
/**
 * Valida e processa variáveis de ambiente
 * Falha fast se configuração inválida
 */
function validateEnv() {
    try {
        if (process.env.NODE_ENV === 'test') {
            process.env.PORT = '3001';
            process.env.ENABLE_CRON_JOBS = 'false';
            process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/mock';
            process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-stable-for-docton-saude-2024-token-key-32chars';
        }
        // Se JWT_SECRET não estiver definido ou for o padrão inseguro, gerar um novo
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'secret') {
            if (process.env.NODE_ENV === 'production') {
                const newSecret = generateSecureJWTSecret();
                console.error('❌ ERRO CRÍTICO: JWT_SECRET não configurado para produção!');
                console.error('📝 Configure a variável JWT_SECRET com o valor:');
                console.error(`JWT_SECRET=${newSecret}`);
                process.exit(1);
            }
            else {
                // Em desenvolvimento, usar um segredo ESTÁVEL para evitar deslogar a cada restart
                const stableDevSecret = 'dev-secret-stable-for-docton-saude-2024-token-key-32chars';
                console.warn('⚠️  JWT_SECRET não configurado, usando segredo estável de desenvolvimento');
                process.env.JWT_SECRET = stableDevSecret;
            }
        }
        const env = envSchema.parse(process.env);
        // Validações adicionais para produção
        if (env.NODE_ENV === 'production') {
            // REMOVIDO: Validação DATABASE_URL
            if (!env.CORS_ORIGIN) {
                console.warn('⚠️  AVISO: CORS_ORIGIN não configurado em produção');
            }
            if (env.JWT_SECRET.length < 32) {
                console.error('❌ ERRO CRÍTICO: JWT_SECRET muito fraco para produção (mínimo 32 caracteres)');
                process.exit(1);
            }
            if (env.ADMIN_DEV_BYPASS) {
                console.warn('⚠️  AVISO: ADMIN_DEV_BYPASS está ativado em produção - desative para segurança');
            }
        }
        console.log('✅ Configuração de ambiente validada com sucesso');
        return env;
    }
    catch (error) {
        console.error('❌ ERRO na validação de ambiente:');
        if (error instanceof zod_1.z.ZodError) {
            error.errors.forEach(err => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
        }
        else {
            console.error(error);
        }
        process.exit(1);
    }
}
exports.env = validateEnv();
//# sourceMappingURL=env.js.map