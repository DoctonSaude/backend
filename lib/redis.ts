import Redis from 'ioredis'

// Configuração Redis para cache e sessões
class RedisClient {
  private client: Redis | null = null
  private enabled: boolean = false

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    // Only create client if Redis URL is configured and not empty
    if (!redisUrl || redisUrl.trim() === '' || redisUrl === 'redis://localhost:6379') {
      console.log('ℹ️  Redis not configured - running without cache')
      this.enabled = false
      return
    }

    try {
      this.client = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('⚠️  Redis connection failed after 3 retries - operating without Redis')
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000)
        },
        // Configurações de cache
        keyPrefix: process.env.REDIS_PREFIX || 'docton:',
        // TTL padrão (1 hora)
        defaultTTL: parseInt(process.env.REDIS_TTL || '3600')
      })

      this.enabled = true

      // Event listeners
      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully')
      })

      this.client.on('error', (err) => {
        console.error('❌ Redis connection error:', err)
      })

      this.client.on('close', () => {
        console.log('🔌 Redis connection closed')
      })
    } catch (error) {
      console.error('Failed to initialize Redis client:', error)
      this.enabled = false
      this.client = null
    }
  }

  // Conectar ao Redis
  async connect(): Promise<void> {
    if (!this.enabled || !this.client) {
      console.log('ℹ️  Redis not enabled - skipping connection')
      return
    }
    try {
      await this.client.connect()
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      // Don't throw - allow app to continue without Redis
    }
  }

  // Cache simples
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.enabled || !this.client) {
      return // Silently skip if Redis not available
    }
    try {
      const serializedValue = JSON.stringify(value)
      const expireTime = ttl || parseInt(process.env.REDIS_TTL || '3600')
      
      if (expireTime > 0) {
        await this.client.setex(key, expireTime, serializedValue)
      } else {
        await this.client.set(key, serializedValue)
      }
    } catch (error) {
      console.error('Redis SET error:', error)
    }
  }

  // Obter cache
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) {
      return null // Return null if Redis not available
    }
    try {
      const value = await this.client.get(key)
      if (value === null) return null
      
      return JSON.parse(value) as T
    } catch (error) {
      console.error('Redis GET error:', error)
      return null
    }
  }

  // Deletar cache
  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return
    }
    try {
      await this.client.del(key)
    } catch (error) {
      console.error('Redis DEL error:', error)
    }
  }

  // Limpar cache por padrão
  async clearPattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return
    }
    try {
      const keys = await this.client.keys(pattern)
      if (keys.length > 0) {
        await this.client.del(...keys)
      }
    } catch (error) {
      console.error('Redis CLEAR_PATTERN error:', error)
    }
  }

  // Sessões de usuário
  async setSession(userId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    await this.set(`session:${userId}`, sessionData, ttl)
  }

  async getSession(userId: string): Promise<any> {
    return await this.get(`session:${userId}`)
  }

  async deleteSession(userId: string): Promise<void> {
    await this.del(`session:${userId}`)
  }

  // Cache de API responses
  async setAPIResponse(endpoint: string, params: any, data: any, ttl: number = 300): Promise<void> {
    const key = `api:${endpoint}:${JSON.stringify(params)}`
    await this.set(key, data, ttl)
  }

  async getAPIResponse(endpoint: string, params: any): Promise<any> {
    const key = `api:${endpoint}:${JSON.stringify(params)}`
    return await this.get(key)
  }

  // Cache de dados do Supabase
  async setSupabaseCache(table: string, id: string, data: any, ttl: number = 600): Promise<void> {
    const key = `supabase:${table}:${id}`
    await this.set(key, data, ttl)
  }

  async getSupabaseCache(table: string, id: string): Promise<any> {
    const key = `supabase:${table}:${id}`
    return await this.get(key)
  }

  // Limpar cache específico
  async clearUserCache(userId: string): Promise<void> {
    await this.clearPattern(`*:${userId}:*`)
    await this.clearPattern(`session:${userId}`)
  }

  async clearAPICache(): Promise<void> {
    await this.clearPattern('api:*')
  }

  async clearSupabaseCache(): Promise<void> {
    await this.clearPattern('supabase:*')
  }

  // Desconectar
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
    }
  }

  // Verificar saúde do Redis
  async healthCheck(): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return false
    }
    try {
      const result = await this.client.ping()
      return result === 'PONG'
    } catch (error) {
      console.error('Redis health check failed:', error)
      return false
    }
  }
}

// Singleton instance
let redisClient: RedisClient | null = null

export function getRedisClient(): RedisClient {
  if (!redisClient) {
    redisClient = new RedisClient()
  }
  return redisClient
}

// Exportar instância padrão
export const redis = getRedisClient()

export default redis
