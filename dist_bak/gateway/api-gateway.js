"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const ioredis_1 = __importDefault(require("ioredis"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const http_proxy_1 = __importDefault(require("http-proxy"));
const uuid_1 = require("uuid");
const opossum_1 = __importDefault(require("opossum"));
const compression_1 = __importDefault(require("compression"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
// Configuration
const GATEWAY_CONFIG = {
    port: process.env.PORT || process.env.GATEWAY_PORT || 3001,
    redis: {
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0')
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // limit each IP to 1000 requests per windowMs
        message: 'Too many requests from this IP'
    },
    services: {
        pharmacy: {
            url: process.env.PHARMACY_SERVICE_URL || 'http://127.0.0.1:3002',
            timeout: 5000,
            circuitBreaker: {
                timeout: 3000,
                errorThresholdPercentage: 50,
                resetTimeout: 30000
            }
        },
        payments: {
            url: process.env.PAYMENTS_SERVICE_URL || 'http://127.0.0.1:3003',
            timeout: 10000,
            circuitBreaker: {
                timeout: 8000,
                errorThresholdPercentage: 30,
                resetTimeout: 60000
            }
        },
        recommendations: {
            url: process.env.RECOMMENDATIONS_SERVICE_URL || 'http://127.0.0.1:3004',
            timeout: 3000,
            circuitBreaker: {
                timeout: 2000,
                errorThresholdPercentage: 40,
                resetTimeout: 30000
            }
        },
        ocr: {
            url: process.env.OCR_SERVICE_URL || 'http://127.0.0.1:3005',
            timeout: 15000,
            circuitBreaker: {
                timeout: 12000,
                errorThresholdPercentage: 25,
                resetTimeout: 45000
            }
        },
        monolith: {
            url: process.env.BACKEND_URL || 'http://127.0.0.1:3006',
            timeout: 30000,
            circuitBreaker: {
                timeout: 25000,
                errorThresholdPercentage: 30,
                resetTimeout: 60000
            }
        }
    }
};
// Redis client for caching
class RedisCache {
    client;
    constructor() {
        const redisOptions = {
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            connectTimeout: 5000,
            retryStrategy: (times) => {
                const delay = Math.min(times * 100, 3000);
                return delay;
            }
        };
        // Se REDIS_URL estiver presente, usa diretamente. Caso contrário, usa os parâmetros individuais.
        if (GATEWAY_CONFIG.redis.url) {
            this.client = new ioredis_1.default(GATEWAY_CONFIG.redis.url, redisOptions);
        }
        else {
            this.client = new ioredis_1.default({ ...GATEWAY_CONFIG.redis, ...redisOptions });
        }
        // Suprime erros de conexão para evitar crash do processo
        this.client.on('error', (err) => {
            console.error('[Redis Gateway Error]:', {
                message: err.message,
                code: err.code,
                stack: err.stack
            });
        });
        this.client.on('connect', () => {
            console.log('✅ API Gateway connected to Redis');
        });
    }
    async get(key) {
        try {
            return await this.client.get(key);
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttl = 300) {
        try {
            await this.client.setex(key, ttl, value);
        }
        catch {
            // Ignora erro de cache
        }
    }
    async del(key) {
        try {
            await this.client.del(key);
        }
        catch {
            // Ignora erro
        }
    }
    async exists(key) {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch {
            return false;
        }
    }
    async incr(key) {
        try {
            return await this.client.incr(key);
        }
        catch {
            return 0;
        }
    }
    async expire(key, ttl) {
        try {
            await this.client.expire(key, ttl);
        }
        catch {
            // Ignora
        }
    }
}
// Metrics collection
class MetricsCollector {
    metrics = new Map();
    recordRequest(service, method, statusCode, responseTime) {
        const key = `${service}:${method}`;
        const current = this.metrics.get(key) || {
            count: 0,
            totalResponseTime: 0,
            errorCount: 0,
            statusCodes: {}
        };
        current.count++;
        current.totalResponseTime += responseTime;
        if (statusCode >= 400) {
            current.errorCount++;
        }
        current.statusCodes[statusCode] = (current.statusCodes[statusCode] || 0) + 1;
        this.metrics.set(key, current);
    }
    getMetrics() {
        const result = {};
        for (const [key, value] of this.metrics.entries()) {
            result[key] = {
                ...value,
                avgResponseTime: value.totalResponseTime / value.count,
                errorRate: (value.errorCount / value.count) * 100
            };
        }
        return result;
    }
    reset() {
        this.metrics.clear();
    }
}
// Circuit Breaker Factory
class CircuitBreakerFactory {
    static create(serviceName, options) {
        return new opossum_1.default(async () => {
            // Placeholder - will be replaced with actual service call
            throw new Error('Service not implemented');
        }, {
            name: `${serviceName}-circuit-breaker`,
            ...options,
            fallback: () => {
                throw new Error(`Service ${serviceName} is currently unavailable`);
            }
        });
    }
}
// Health Checker
class HealthChecker {
    services = new Map();
    registerService(name, healthCheck) {
        this.services.set(name, healthCheck);
    }
    async checkHealth() {
        const results = {};
        for (const [name, healthCheck] of this.services.entries()) {
            try {
                results[name] = await healthCheck();
            }
            catch (error) {
                results[name] = false;
            }
        }
        return results;
    }
}
// API Gateway Class
class APIGateway {
    app;
    cache;
    metrics;
    healthChecker;
    circuitBreakers = new Map();
    monolithProxy; // Armazena o proxy do Monolito para a API
    socketProxy; // Armazena o proxy específico para WebSockets (Socket.io)
    constructor() {
        this.app = (0, express_1.default)();
        this.cache = new RedisCache();
        this.metrics = new MetricsCollector();
        this.healthChecker = new HealthChecker();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupCircuitBreakers();
        this.setupHealthChecks();
    }
    setupMiddleware() {
        // Security
        this.app.use((0, helmet_1.default)({
            frameguard: false,
            contentSecurityPolicy: false
        }));
        // 1. CORS Middleware (Lista Estática e Robusta)
        this.app.use((0, cors_1.default)({
            origin: [
                'http://localhost:3000',
                'http://localhost:5173',
                'http://localhost:5180',
                'http://localhost:5181',
                'https://app.docton.com.br',
                'https://admin.docton.com.br',
                'https://parceiro.docton.com.br',
                'https://docton.com.br'
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Request-ID']
        }));
        // Compression
        this.app.use((0, compression_1.default)());
        // Request logging
        this.app.use((req, res, next) => {
            const requestId = (0, uuid_1.v4)();
            req.headers['x-request-id'] = requestId;
            console.log(`[GW-REQ] ${req.method} ${req.path}`);
            next();
        });
        // Rate limiting
        const limiter = (0, express_rate_limit_1.default)(GATEWAY_CONFIG.rateLimit);
        this.app.use('/api/', limiter);
        // Body parsing REMOVIDO para evitar quebra de stream no Proxy (POST requests)
        // Se o Gateway precisar ler o corpo no futuro, usar 'fixRequestBody' do http-proxy-middleware
    }
    setupRoutes() {
        // Health check endpoint (Railway standard at /api/health)
        this.app.get('/api/health', async (req, res) => {
            const health = await this.healthChecker.checkHealth();
            const monolithHealthy = health['monolith'] !== false;
            res.status(monolithHealthy ? 200 : 503).json({
                status: monolithHealthy ? 'ok' : 'initializing',
                monolith: monolithHealthy ? 'up' : 'down',
                service: 'api-gateway',
                timestamp: new Date().toISOString()
            });
        });
        this.app.get('/health', async (req, res) => {
            const health = await this.healthChecker.checkHealth();
            const allHealthy = Object.values(health).every(status => status);
            res.status(allHealthy ? 200 : 503).json({
                status: allHealthy ? 'healthy' : 'degraded',
                services: health,
                timestamp: new Date().toISOString()
            });
        });
        // Metrics endpoint
        this.app.get('/metrics', (req, res) => {
            res.json({
                metrics: this.metrics.getMetrics(),
                timestamp: new Date().toISOString()
            });
        });
        // Service routes
        this.setupServiceRoutes();
    }
    setupServiceRoutes() {
        // --- Módulo Farmácia (Híbrido) ---
        // 1. Busca e Público (Next.js - Porta 3002)
        this.app.use('/api/pharmacy/nearby', this.createServiceProxy('pharmacy'));
        this.app.use('/api/pharmacy/search', this.createServiceProxy('pharmacy'));
        // 2. OUTRAS ROTAS ESPECÍFICAS
        this.app.use('/api/payments', this.createServiceProxy('payments'));
        this.app.use('/api/recommendations', this.createServiceProxy('recommendations'));
        this.app.use('/api/ocr', this.createServiceProxy('ocr'));
        // 3. Monolito (Gestão / Operações / Socket.io)
        // Criamos o proxy do Monolito para a API
        this.monolithProxy = (0, http_proxy_middleware_1.createProxyMiddleware)({
            target: GATEWAY_CONFIG.services.monolith.url,
            changeOrigin: true,
            ws: true,
            logLevel: 'debug',
            pathRewrite: (path) => path.startsWith('/api') ? path : `/api${path}`,
            onProxyRes: (proxyRes, req) => {
                if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                    console.log(`[GW-RES] Proxy ${req.url} -> ${proxyRes.statusCode}`);
                }
            },
            onError: (err, req, res) => {
                console.error(`[GW-ERR] Monolith Proxy Error:`, err.message);
                const origin = req.headers.origin;
                if (origin && res.setHeader) {
                    res.setHeader('Access-Control-Allow-Origin', origin);
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                }
                if (res.status) {
                    res.status(503).json({
                        error: 'Service temporarily unavailable',
                        service: 'monolith'
                    });
                }
            }
        });
        // Criamos o proxy exclusivo para WebSockets (sem prefixo /api)
        this.socketProxy = (0, http_proxy_middleware_1.createProxyMiddleware)({
            target: GATEWAY_CONFIG.services.monolith.url,
            changeOrigin: true,
            ws: true,
            logLevel: 'debug',
            onError: (err, req, res) => {
                console.error(`[GW-WS-ERR] Socket Proxy Error:`, err.message);
            }
        });
        // Rota padrão do Monolito (/api)
        this.app.use('/api', this.monolithProxy);
        // Rota direta do Socket.io (usando o socketProxy dedicado)
        this.app.use('/socket.io', this.socketProxy);
    }
    createServiceProxy(serviceName) {
        const config = GATEWAY_CONFIG.services[serviceName];
        return (0, http_proxy_middleware_1.createProxyMiddleware)({
            target: config.url,
            changeOrigin: true,
            timeout: config.timeout,
            pathRewrite: (path) => {
                if (serviceName === 'pharmacy') {
                    return `/api/pharmacies${path}`;
                }
                return path.replace(new RegExp(`^/api/${serviceName}`), '/api');
            },
            onError: (err, req, res) => {
                console.error(`[GW-ERR] Proxy ${serviceName} error:`, err.message);
                const origin = req.headers.origin;
                if (origin && res.setHeader) {
                    res.setHeader('Access-Control-Allow-Origin', origin);
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                }
                if (res.status) {
                    res.status(503).json({ error: `Service ${serviceName} unavailable` });
                }
            }
        });
    }
    setupCircuitBreakers() {
        for (const [serviceName, config] of Object.entries(GATEWAY_CONFIG.services)) {
            const circuitBreaker = CircuitBreakerFactory.create(serviceName, config.circuitBreaker);
            this.circuitBreakers.set(serviceName, circuitBreaker);
        }
    }
    setupHealthChecks() {
        this.healthChecker.registerService('redis', async () => {
            try {
                await this.cache.get('health-check');
                return true;
            }
            catch (error) {
                return false;
            }
        });
        this.healthChecker.registerService('monolith', async () => {
            try {
                const response = await fetch(`${GATEWAY_CONFIG.services.monolith.url}/api/health`, { signal: AbortSignal.timeout(2000) });
                return response.ok;
            }
            catch (error) {
                return false;
            }
        });
    }
    start() {
        const server = this.app.listen(GATEWAY_CONFIG.port, () => {
            console.log(`🚀 API Gateway v1.2 Running on Port ${GATEWAY_CONFIG.port}`);
        });
        // --- CRITICAL FIX: WEB SOCKET UPGRADE HANDLER (USING RAW HTTP-PROXY) ---
        const wsProxy = http_proxy_1.default.createProxyServer({
            target: GATEWAY_CONFIG.services.monolith.url,
            ws: true
        });
        wsProxy.on('error', (err) => {
            console.error('[GW-WS-ERR] Raw Proxy Error:', err.message);
        });
        server.on('upgrade', (req, socket, head) => {
            const url = req.url || '';
            if (url.startsWith('/socket.io')) {
                console.log(`[GW-WS] Upgrading Socket.io connection: ${url}`);
                wsProxy.ws(req, socket, head);
            }
            else {
                socket.destroy();
            }
        });
        return server;
    }
}
// Start the gateway
if (require.main === module) {
    const gateway = new APIGateway();
    gateway.start();
}
exports.default = APIGateway;
//# sourceMappingURL=api-gateway.js.map