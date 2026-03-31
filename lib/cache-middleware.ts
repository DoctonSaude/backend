import { NextRequest, NextResponse } from 'next/server'
import { redis } from '../lib/redis'

// Configurações de cache
interface CacheConfig {
  ttl: number // Tempo em segundos
  vary?: string[] // Headers para variação de cache
  tags?: string[] // Tags para invalidação
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Cache de 5 minutos para endpoints públicos
  '/api/health': { ttl: 300 },
  '/api/public/medicamentos': { ttl: 300 },
  '/api/public/farmacias': { ttl: 300 },
  
  // Cache de 1 minuto para dados de usuário
  '/api/user/profile': { ttl: 60, vary: ['authorization'] },
  '/api/user/preferences': { ttl: 60, vary: ['authorization'] },
  
  // Cache de 30 segundos para agendamentos
  '/api/agendamentos': { ttl: 30, vary: ['authorization'] },
  
  // Cache de 10 minutos para dados estáticos
  '/api/especialidades': { ttl: 600 },
  '/api/convenios': { ttl: 600 },
  '/api/profissionais': { ttl: 300 }
}

// Middleware de cache para API
export async function cacheMiddleware(
  request: NextRequest,
  config?: Partial<CacheConfig>
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname
  
  // Verificar se endpoint tem cache configurado
  const cacheConfig = CACHE_CONFIGS[pathname]
  if (!cacheConfig && !config) {
    return null // Sem cache para este endpoint
  }

  const finalConfig = { ...cacheConfig, ...config }
  
  try {
    // Gerar chave de cache
    const cacheKey = generateCacheKey(request, finalConfig)
    
    // Tentar obter do cache
    const cachedResponse = await redis.get(cacheKey)
    if (cachedResponse) {
      console.log(`🎯 Cache HIT for ${pathname}`)
      
      const response = new NextResponse(JSON.stringify(cachedResponse.body), {
        status: cachedResponse.status,
        headers: cachedResponse.headers
      })
      
      // Adicionar header indicando cache
      response.headers.set('X-Cache', 'HIT')
      response.headers.set('X-Cache-Key', cacheKey)
      
      return response
    }
    
    console.log(`❌ Cache MISS for ${pathname}`)
    return null // Continuar para o handler original
    
  } catch (error) {
    console.error('Cache middleware error:', error)
    return null // Em caso de erro, continua sem cache
  }
}

// Salvar resposta no cache
export async function saveResponseToCache(
  request: NextRequest,
  response: NextResponse,
  config?: Partial<CacheConfig>
): Promise<void> {
  const pathname = request.nextUrl.pathname
  
  // Verificar se endpoint tem cache configurado
  const cacheConfig = CACHE_CONFIGS[pathname]
  if (!cacheConfig && !config) {
    return // Sem cache para este endpoint
  }

  const finalConfig = { ...cacheConfig, ...config }
  
  try {
    // Gerar chave de cache
    const cacheKey = generateCacheKey(request, finalConfig)
    
    // Preparar dados para cache
    const body = await response.json()
    const cacheData = {
      body,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    }
    
    // Salvar no cache
    await redis.set(cacheKey, cacheData, finalConfig.ttl)
    console.log(`💾 Cached response for ${pathname} (${finalConfig.ttl}s)`)
    
  } catch (error) {
    console.error('Save to cache error:', error)
  }
}

// Gerar chave de cache única
function generateCacheKey(request: NextRequest, config: CacheConfig): string {
  const pathname = request.nextUrl.pathname
  const searchParams = request.nextUrl.searchParams.toString()
  
  let key = `api:${pathname}`
  
  // Adicionar query params
  if (searchParams) {
    key += `:${searchParams}`
  }
  
  // Adicionar variação por headers se configurado
  if (config.vary) {
    const varyValues = config.vary
      .map(header => request.headers.get(header))
      .filter(Boolean)
      .join(':')
    
    if (varyValues) {
      key += `:${varyValues}`
    }
  }
  
  return key
}

// Invalidar cache por padrão
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    await redis.clearPattern(`api:${pattern}*`)
    console.log(`🗑️ Invalidated cache pattern: ${pattern}`)
  } catch (error) {
    console.error('Cache invalidation error:', error)
  }
}

// Invalidar cache por tags
export async function invalidateCacheByTags(tags: string[]): Promise<void> {
  try {
    for (const tag of tags) {
      await redis.clearPattern(`*:${tag}:*`)
    }
    console.log(`🏷️ Invalidated cache by tags: ${tags.join(', ')}`)
  } catch (error) {
    console.error('Cache tag invalidation error:', error)
  }
}

// Wrapper para endpoints de API com cache
export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<CacheConfig>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Tentar obter do cache
    const cachedResponse = await cacheMiddleware(request, config)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Executar handler original
    const response = await handler(request)
    
    // Salvar no cache se response for bem-sucedida
    if (response.status === 200) {
      await saveResponseToCache(request, response, config)
    }
    
    // Adicionar header indicando cache miss
    response.headers.set('X-Cache', 'MISS')
    
    return response
  }
}

export default {
  cacheMiddleware,
  saveResponseToCache,
  invalidateCache,
  withCache
}
