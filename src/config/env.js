"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
var zod_1 = require("zod");
var crypto = require("crypto");
/**
 * Schema de validação para variáveis de ambiente
 * Garante que todas as configurações críticas estejam presentes e válidas
 */
var envSchema = zod_1.z.object({
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
    REDIS_URL: zod_1.z.string().transform(function (v) { return v === '' ? undefined : v; }).optional(),
    // Supabase
    SUPABASE_URL: zod_1.z.string().transform(function (v) { return v === '' ? undefined : v; }).optional(),
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
    VAPID_SUBJECT: zod_1.z.string().refine(function (val) { return val.startsWith('mailto:') || val.includes('@'); }, {
        message: "VAPID_SUBJECT deve ser um e-mail válido ou começar com 'mailto:'"
    }).optional(),
    // Cron Jobs
    ENABLE_CRON_JOBS: zod_1.z.string().transform(function (val) { return val === 'true'; }).default('true'),
    // Logs
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).pipe(zod_1.z.number()).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).pipe(zod_1.z.number()).default('500'), // Adjusted to a more secure baseline
    AUTH_RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).pipe(zod_1.z.number()).default('20'), // Stricter auth limit
    // Security
    BCRYPT_ROUNDS: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(10).max(15)).default('12'),
    ADMIN_DEV_BYPASS: zod_1.z.string().transform(function (val) { return val === 'true'; }).default('false'),
    ADMIN_DEV_USER_ID: zod_1.z.string().default('admin-dev'),
    // OpenAI
    OPENAI_API_KEY: zod_1.z.string().optional(),
    // Payment Gateway (Assas)
    PAYMENT_GATEWAY_PROVIDER: zod_1.z.enum(['mock', 'assas', 'stripe', 'mercadopago', 'pagarme']).default('mock'),
    PAYMENT_GATEWAY_API_KEY: zod_1.z.string().optional(),
    PAYMENT_GATEWAY_BASE_URL: zod_1.z.string().optional(),
    PAYMENT_GATEWAY_WEBHOOK_SECRET: zod_1.z.string().optional(),
    PAYMENT_GATEWAY_PUBLIC_KEY: zod_1.z.string().optional(),
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
                var newSecret = generateSecureJWTSecret();
                console.error('❌ ERRO CRÍTICO: JWT_SECRET não configurado para produção!');
                console.error('📝 Configure a variável JWT_SECRET com o valor:');
                console.error("JWT_SECRET=".concat(newSecret));
                process.exit(1);
            }
            else {
                // Em desenvolvimento, usar um segredo ESTÁVEL para evitar deslogar a cada restart
                var stableDevSecret = 'dev-secret-stable-for-docton-saude-2024-token-key-32chars';
                console.warn('⚠️  JWT_SECRET não configurado, usando segredo estável de desenvolvimento');
                process.env.JWT_SECRET = stableDevSecret;
            }
        }
        var env_1 = envSchema.parse(process.env);
        // Validações adicionais para produção
        if (env_1.NODE_ENV === 'production') {
            // REMOVIDO: Validação DATABASE_URL
            if (!env_1.CORS_ORIGIN) {
                console.warn('⚠️  AVISO: CORS_ORIGIN não configurado em produção');
            }
            if (env_1.JWT_SECRET.length < 32) {
                console.error('❌ ERRO CRÍTICO: JWT_SECRET muito fraco para produção (mínimo 32 caracteres)');
                process.exit(1);
            }
            if (env_1.ADMIN_DEV_BYPASS) {
                console.error('❌ ERRO CRÍTICO: ADMIN_DEV_BYPASS está ativado em produção - bloqueando inicialização por segurança');
                process.exit(1);
            }
        }
        console.log('✅ Configuração de ambiente validada com sucesso');
        return env_1;
    }
    catch (error) {
        console.error('❌ ERRO na validação de ambiente:');
        if (error instanceof zod_1.z.ZodError) {
            error.errors.forEach(function (err) {
                console.error("  - ".concat(err.path.join('.'), ": ").concat(err.message));
            });
        }
        else {
            console.error(error);
        }
        process.exit(1);
    }
}
exports.env = validateEnv();
