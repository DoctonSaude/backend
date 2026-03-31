"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const ioredis_1 = __importDefault(require("ioredis"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const uuid_1 = require("uuid");
const opossum_1 = __importDefault(require("opossum"));
const compression_1 = __importDefault(require("compression"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
// Configuration
const GATEWAY_CONFIG = {
    port: process.env.GATEWAY_PORT || 3001,
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
            url: process.env.PHARMACY_SERVICE_URL || 'http://localhost:3002',
            timeout: 5000,
            circuitBreaker: {
                timeout: 3000,
                errorThresholdPercentage: 50,
                resetTimeout: 30000
            }
        },
        payments: {
            url: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:3003',
            timeout: 10000,
            circuitBreaker: {
                timeout: 8000,
                errorThresholdPercentage: 30,
                resetTimeout: 60000
            }
        },
        recommendations: {
            url: process.env.RECOMMENDATIONS_SERVICE_URL || 'http://localhost:3004',
            timeout: 3000,
            circuitBreaker: {
                timeout: 2000,
                errorThresholdPercentage: 40,
                resetTimeout: 30000
            }
        },
        ocr: {
            url: process.env.OCR_SERVICE_URL || 'http://localhost:3005',
            timeout: 15000,
            circuitBreaker: {
                timeout: 12000,
                errorThresholdPercentage: 25,
                resetTimeout: 45000
            }
        }
    }
};
// Redis client for caching
class RedisCache {
    client;
    constructor() {
        this.client = new ioredis_1.default(GATEWAY_CONFIG.redis);
    }
    async get(key) {
        return await this.client.get(key);
    }
    async set(key, value, ttl = 300) {
        await this.client.setex(key, ttl, value);
    }
    async del(key) {
        await this.client.del(key);
    }
    async exists(key) {
        const result = await this.client.exists(key);
        return result === 1;
    }
    async incr(key) {
        return await this.client.incr(key);
    }
    async expire(key, ttl) {
        await this.client.expire(key, ttl);
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
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)({
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true
        }));
        // Compression
        this.app.use((0, compression_1.default)());
        // Request logging
        this.app.use((req, res, next) => {
            const requestId = (0, uuid_1.v4)();
            req.headers['x-request-id'] = requestId;
            console.log(`[${requestId}] ${req.method} ${req.path}`);
            next();
        });
        // Rate limiting
        const limiter = (0, express_rate_limit_1.default)(GATEWAY_CONFIG.rateLimit);
        this.app.use('/api/', limiter);
        // Body parsing
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
    }
    setupRoutes() {
        // Health check endpoint
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
        // Cache management endpoints
        this.app.delete('/cache/:key', async (req, res) => {
            await this.cache.del(req.params.key);
            res.json({ message: 'Cache cleared' });
        });
        // Service routes
        this.setupServiceRoutes();
    }
    setupServiceRoutes() {
        // Pharmacy service routes
        this.app.use('/api/pharmacy', this.createServiceProxy('pharmacy', [
            'GET /nearby',
            'GET /:id/performance',
            'POST /quote',
            'GET /search'
        ]));
        // Payments service routes
        this.app.use('/api/payments', this.createServiceProxy('payments', [
            'POST /process',
            'GET /:id/status',
            'POST /refund',
            'GET /methods'
        ]));
        // Recommendations service routes
        this.app.use('/api/recommendations', this.createServiceProxy('recommendations', [
            'GET /medications',
            'GET /pharmacies',
            'POST /analyze',
            'GET /health'
        ]));
        // OCR service routes
        this.app.use('/api/ocr', this.createServiceProxy('ocr', [
            'POST /process',
            'GET /:id/status',
            'GET /:id/result'
        ]));
    }
    createServiceProxy(serviceName, allowedRoutes) {
        const config = GATEWAY_CONFIG.services[serviceName];
        const proxy = (0, http_proxy_middleware_1.createProxyMiddleware)({
            target: config.url,
            changeOrigin: true,
            timeout: config.timeout,
            pathRewrite: {
                [`^/api/${serviceName}`]: '/api'
            },
            onProxyReq: (proxyReq, req) => {
                // Add request ID
                proxyReq.setHeader('X-Request-ID', req.headers['x-request-id']);
                // Add authentication headers
                if (req.headers.authorization) {
                    proxyReq.setHeader('Authorization', req.headers.authorization);
                }
            },
            onProxyRes: (proxyRes, req, res) => {
                // Log response
                const requestId = req.headers['x-request-id'];
                console.log(`[${requestId}] Response: ${proxyRes.statusCode}`);
            },
            onError: (err, req, res) => {
                console.error(`Proxy error for ${serviceName}:`, err);
                res.status(503).json({
                    error: 'Service temporarily unavailable',
                    service: serviceName
                });
            }
        });
        return async (req, res, next) => {
            const startTime = Date.now();
            const requestId = req.headers['x-request-id'];
            try {
                // Check if route is allowed
                const routePath = `${req.method} ${req.path}`;
                const isAllowed = allowedRoutes.some(route => {
                    const [method, path] = route.split(' ');
                    return method === req.method && req.path.match(path.replace('*', '.*'));
                });
                if (!isAllowed) {
                    return res.status(404).json({ error: 'Route not found' });
                }
                // Check cache for GET requests
                if (req.method === 'GET') {
                    const cacheKey = `cache:${serviceName}:${req.path}:${JSON.stringify(req.query)}`;
                    const cached = await this.cache.get(cacheKey);
                    if (cached) {
                        const data = JSON.parse(cached);
                        return res.json(data);
                    }
                }
                // Use circuit breaker
                const circuitBreaker = this.circuitBreakers.get(serviceName);
                if (circuitBreaker && !circuitBreaker.fire) {
                    return res.status(503).json({
                        error: 'Service circuit breaker is open',
                        service: serviceName
                    });
                }
                // Continue with proxy
                proxy(req, res, next);
                // Cache response for GET requests
                if (req.method === 'GET' && res.statusCode === 200) {
                    // This is a simplification - in production, you'd want to intercept the response
                    const cacheKey = `cache:${serviceName}:${req.path}:${JSON.stringify(req.query)}`;
                    // Cache logic would go here
                }
            }
            catch (error) {
                console.error(`Gateway error for ${serviceName}:`, error);
                res.status(500).json({
                    error: 'Internal gateway error',
                    service: serviceName
                });
            }
            finally {
                // Record metrics
                const responseTime = Date.now() - startTime;
                this.metrics.recordRequest(serviceName, req.method, res.statusCode, responseTime);
            }
        };
    }
    setupCircuitBreakers() {
        for (const [serviceName, config] of Object.entries(GATEWAY_CONFIG.services)) {
            const circuitBreaker = CircuitBreakerFactory.create(serviceName, config.circuitBreaker);
            this.circuitBreakers.set(serviceName, circuitBreaker);
            circuitBreaker.on('open', () => {
                console.warn(`Circuit breaker OPEN for ${serviceName}`);
            });
            circuitBreaker.on('halfOpen', () => {
                console.log(`Circuit breaker HALF-OPEN for ${serviceName}`);
            });
            circuitBreaker.on('close', () => {
                console.log(`Circuit breaker CLOSED for ${serviceName}`);
            });
        }
    }
    setupHealthChecks() {
        // Register health checks for each service
        this.healthChecker.registerService('redis', async () => {
            try {
                await this.cache.get('health-check');
                return true;
            }
            catch (error) {
                return false;
            }
        });
        this.healthChecker.registerService('pharmacy', async () => {
            try {
                // Simple health check - would be actual service ping
                return true;
            }
            catch (error) {
                return false;
            }
        });
        this.healthChecker.registerService('payments', async () => {
            try {
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
    start() {
        this.app.listen(GATEWAY_CONFIG.port, () => {
            console.log(`🚀 API Gateway running on port ${GATEWAY_CONFIG.port}`);
            console.log(`📊 Health check: http://localhost:${GATEWAY_CONFIG.port}/health`);
            console.log(`📈 Metrics: http://localhost:${GATEWAY_CONFIG.port}/metrics`);
        });
    }
}
// Start the gateway
if (require.main === module) {
    const gateway = new APIGateway();
    gateway.start();
}
exports.default = APIGateway;
//# sourceMappingURL=api-gateway.js.map