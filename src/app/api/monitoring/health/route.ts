import { NextRequest, NextResponse } from 'next/server'
import { redis } from '../../lib/redis'

// Health Check com Redis
export async function GET(request: NextRequest) {
  try {
    // Verificar saúde do Redis
    const redisHealth = await redis.healthCheck()
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        redis: redisHealth ? 'healthy' : 'unhealthy',
        database: 'unknown' // TODO: Implementar verificação do banco
      },
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }

    return NextResponse.json(health, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Redis-Status': redisHealth ? 'connected' : 'disconnected'
      }
    })

  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
