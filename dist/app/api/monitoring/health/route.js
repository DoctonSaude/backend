"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const redis_1 = require("../../lib/redis");
// Health Check com Redis
async function GET(request) {
    try {
        // Verificar saúde do Redis
        const redisHealth = await redis_1.redis.healthCheck();
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
        };
        return server_1.NextResponse.json(health, {
            status: 200,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Redis-Status': redisHealth ? 'connected' : 'disconnected'
            }
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        return server_1.NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map