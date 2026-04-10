import express, { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import Redis, { type Redis as RedisClient } from 'ioredis'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { v4 as uuidv4 } from 'uuid'
import CircuitBreaker from 'opossum'
import compression from 'compression'
import helmet from 'helmet'
import cors from 'cors'

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
    },
    monolith: {
      url: process.env.BACKEND_URL || 'http://localhost:3001',
      timeout: 10000,
      circuitBreaker: {
        timeout: 8000,
        errorThresholdPercentage: 30,
        resetTimeout: 60000
      }
    }
  }
}

// Redis client for caching
class RedisCache {
  private client: RedisClient

  constructor() {
    this.client = new Redis(GATEWAY_CONFIG.redis)
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key)
  }

  async set(key: string, value: string, ttl: number = 300): Promise<void> {
    await this.client.setex(key, ttl, value)
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key)
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl)
  }
}

// Metrics collection
class MetricsCollector {
  private metrics: Map<string, any> = new Map()

  recordRequest(service: string, method: string, statusCode: number, responseTime: number): void {
    const key = `${service}:${method}`
    const current = this.metrics.get(key) || {
      count: 0,
      totalResponseTime: 0,
      errorCount: 0,
      statusCodes: {}
    }

    current.count++
    current.totalResponseTime += responseTime
    if (statusCode >= 400) {
      current.errorCount++
    }
    current.statusCodes[statusCode] = (current.statusCodes[statusCode] || 0) + 1

    this.metrics.set(key, current)
  }

  getMetrics(): any {
    const result: any = {}
    for (const [key, value] of this.metrics.entries()) {
      result[key] = {
        ...value,
        avgResponseTime: value.totalResponseTime / value.count,
        errorRate: (value.errorCount / value.count) * 100
      }
    }
    return result
  }

  reset(): void {
    this.metrics.clear()
  }
}

// Circuit Breaker Factory
class CircuitBreakerFactory {
  static create(serviceName: string, options: any): any {
    return new CircuitBreaker(async () => {
      // Placeholder - will be replaced with actual service call
      throw new Error('Service not implemented')
    }, {
      name: `${serviceName}-circuit-breaker`,
      ...options,
      fallback: () => {
        throw new Error(`Service ${serviceName} is currently unavailable`)
      }
    })
  }
}

// Health Checker
class HealthChecker {
  private services: Map<string, any> = new Map()

  registerService(name: string, healthCheck: () => Promise<boolean>): void {
    this.services.set(name, healthCheck)
  }

  async checkHealth(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {}

    for (const [name, healthCheck] of this.services.entries()) {
      try {
        results[name] = await healthCheck()
      } catch (error) {
        results[name] = false
      }
    }

    return results
  }
}

// API Gateway Class
class APIGateway {
  private app: express.Application
  private cache: RedisCache
  private metrics: MetricsCollector
  private healthChecker: HealthChecker
  private circuitBreakers: Map<string, any> = new Map()

  constructor() {
    this.app = express()
    this.cache = new RedisCache()
    this.metrics = new MetricsCollector()
    this.healthChecker = new HealthChecker()

    this.setupMiddleware()
    this.setupRoutes()
    this.setupCircuitBreakers()
    this.setupHealthChecks()
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet())
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }))

    // Compression
    this.app.use(compression())

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId = uuidv4()
      req.headers['x-request-id'] = requestId
      console.log(`[${requestId}] ${req.method} ${req.path}`)
      next()
    })

    // Rate limiting
    const limiter = rateLimit(GATEWAY_CONFIG.rateLimit)
    this.app.use('/api/', limiter)

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true }))
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      const health = await this.healthChecker.checkHealth()
      const allHealthy = Object.values(health).every(status => status)

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'degraded',
        services: health,
        timestamp: new Date().toISOString()
      })
    })

    // Metrics endpoint
    this.app.get('/metrics', (req: Request, res: Response) => {
      res.json({
        metrics: this.metrics.getMetrics(),
        timestamp: new Date().toISOString()
      })
    })

    // Cache management endpoints
    this.app.delete('/cache/:key', async (req: Request, res: Response) => {
      await this.cache.del(req.params.key)
      res.json({ message: 'Cache cleared' })
    })

    // Service routes
    this.setupServiceRoutes()
  }

  private setupServiceRoutes(): void {
    // --- Módulo Farmácia (Híbrido) ---
    // 1. Busca e Público (Next.js - Porta 3002)
    // Estas rotas têm prioridade e são desviadas para o serviço Next.js
    this.app.use('/api/pharmacy', this.createServiceProxy('pharmacy', [
      'GET /nearby',
      'GET /:id/performance',
      'POST /quote',
      'GET /search'
    ]))

    // 2. Gestão e Operações (Monolito - Porta 3001)
    // Agindo como fallback: QUALQUER outra rota enviada para /api/pharmacy vai para o Monolito
    this.app.use('/api/pharmacy', this.createServiceProxy('monolith', [
      'GET *',
      'POST *',
      'PUT *',
      'DELETE *',
      'PATCH *'
    ]))

    // Payments service routes
    this.app.use('/api/payments', this.createServiceProxy('payments', [
      'POST /process',
      'GET /:id/status',
      'POST /refund',
      'GET /methods'
    ]))

    // Recommendations service routes
    this.app.use('/api/recommendations', this.createServiceProxy('recommendations', [
      'GET /medications',
      'GET /pharmacies',
      'POST /analyze',
      'GET /health'
    ]))

    // OCR service routes
    this.app.use('/api/ocr', this.createServiceProxy('ocr', [
      'POST /process',
      'GET /:id/status',
      'GET /:id/result'
    ]))
  }

  private createServiceProxy(serviceName: string, allowedRoutes: string[]): express.RequestHandler {
    const config = GATEWAY_CONFIG.services[serviceName as keyof typeof GATEWAY_CONFIG.services]

    const proxy = createProxyMiddleware({
      target: config.url,
      changeOrigin: true,
      timeout: config.timeout,
      pathRewrite: (path) => {
        // Regra para o Monolito (Gestão/Operações)
        if (serviceName === 'monolith') {
          // O Express/HPM remove o mount point (/api/pharmacy). 
          // Precisamos re-adicionar para o monolito reconhecer nas rotas internas.
          return `/api/pharmacy${path}`;
        }
        
        // Regra para o Next.js (Público/Histórico)
        if (serviceName === 'pharmacy') {
          // O Next.js usa plural (/api/pharmacies) para rotas legadas
          if (path.startsWith('/nearby')) return `/api/pharmacies${path}`;
          if (path.startsWith('/search')) return `/api/pharmacies${path}`;
          return `/api/pharmacies${path}`;
        }

        // Padrão para outros microserviços
        return path.replace(new RegExp(`^/api/${serviceName}`), '/api');
      },
      onProxyReq: (proxyReq: any, req: any) => {
        // Add request ID
        proxyReq.setHeader('X-Request-ID', req.headers['x-request-id'])

        // Add authentication headers
        if (req.headers.authorization) {
          proxyReq.setHeader('Authorization', req.headers.authorization)
        }

        // Add diagnostic headers
        proxyReq.setHeader('X-Gateway-Matched', 'true')
        proxyReq.setHeader('X-Gateway-Service', serviceName)
      },
      onProxyRes: (proxyRes: any, req: any, res: any) => {
        // Log response
        const requestId = req.headers['x-request-id']
        console.log(`[${requestId}] Response: ${proxyRes.statusCode}`)
      },
      onError: (err: any, req: any, res: any) => {
        console.error(`Proxy error for ${serviceName}:`, err)
        res.status(503).json({
          error: 'Service temporarily unavailable',
          service: serviceName
        })
      }
    })

    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now()
      const requestId = req.headers['x-request-id'] as string

      try {
        // Check if route is allowed
        const cleanPath = req.path.replace(/\/$/, '') || '/' // Remove trailing slash para comparação
        
        const isAllowed = allowedRoutes.some(route => {
          const [method, routePath] = route.split(' ')
          if (method !== req.method) return false

          // Converte caminhos com :id ou * em expressões regulares funcionais
          // Escapa caracteres especiais de regex e transforma :id em [^/]+
          const regexString = routePath
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escapa caracteres especiais
            .replace(/\\:\w+/g, '[^/]+')             // Converte :id em qualquer coisa exceto /
            .replace(/\\\*/g, '.*')                  // Converte * em qualquer coisa

          const regex = new RegExp(`^${regexString}/?$`) // Permite barra opcional no final
          return regex.test(cleanPath)
        })

        if (!isAllowed) {
          // Log detalhado de bloqueio para diagnóstico
          console.warn(`[Gateway] Blocked: ${req.method} ${req.path} (Service: ${serviceName})`)
          return next()
        }

        console.log(`[Gateway] Allowed: ${req.method} ${req.path} -> ${serviceName}`)

        // Check cache for GET requests
        if (req.method === 'GET') {
          const cacheKey = `cache:${serviceName}:${req.path}:${JSON.stringify(req.query)}`
          const cached = await this.cache.get(cacheKey)

          if (cached) {
            const data = JSON.parse(cached)
            return res.json(data)
          }
        }

        // Use circuit breaker
        const circuitBreaker = this.circuitBreakers.get(serviceName)
        if (circuitBreaker && !circuitBreaker.fire) {
          return res.status(503).json({
            error: 'Service circuit breaker is open',
            service: serviceName
          })
        }

        // Continue with proxy
        proxy(req, res, next)

        // Cache response for GET requests
        if (req.method === 'GET' && res.statusCode === 200) {
          // This is a simplification - in production, you'd want to intercept the response
          const cacheKey = `cache:${serviceName}:${req.path}:${JSON.stringify(req.query)}`
          // Cache logic would go here
        }

      } catch (error) {
        console.error(`Gateway error for ${serviceName}:`, error)
        res.status(500).json({
          error: 'Internal gateway error',
          service: serviceName
        })
      } finally {
        // Record metrics
        const responseTime = Date.now() - startTime
        this.metrics.recordRequest(serviceName, req.method, res.statusCode, responseTime)
      }
    }
  }

  private setupCircuitBreakers(): void {
    for (const [serviceName, config] of Object.entries(GATEWAY_CONFIG.services)) {
      const circuitBreaker = CircuitBreakerFactory.create(serviceName, config.circuitBreaker)
      this.circuitBreakers.set(serviceName, circuitBreaker)

      circuitBreaker.on('open', () => {
        console.warn(`Circuit breaker OPEN for ${serviceName}`)
      })

      circuitBreaker.on('halfOpen', () => {
        console.log(`Circuit breaker HALF-OPEN for ${serviceName}`)
      })

      circuitBreaker.on('close', () => {
        console.log(`Circuit breaker CLOSED for ${serviceName}`)
      })
    }
  }

  private setupHealthChecks(): void {
    // Register health checks for each service
    this.healthChecker.registerService('redis', async () => {
      try {
        await this.cache.get('health-check')
        return true
      } catch (error) {
        return false
      }
    })

    this.healthChecker.registerService('pharmacy', async () => {
      try {
        // Simple health check - would be actual service ping
        return true
      } catch (error) {
        return false
      }
    })

    this.healthChecker.registerService('payments', async () => {
      try {
        return true
      } catch (error) {
        return false
      }
    })
  }

  public start(): void {
    this.app.listen(GATEWAY_CONFIG.port, () => {
      console.log(`🚀 API Gateway running on port ${GATEWAY_CONFIG.port}`)
      console.log(`📊 Health check: http://localhost:${GATEWAY_CONFIG.port}/health`)
      console.log(`📈 Metrics: http://localhost:${GATEWAY_CONFIG.port}/metrics`)
    })
  }
}

// Start the gateway
if (require.main === module) {
  const gateway = new APIGateway()
  gateway.start()
}

export default APIGateway
