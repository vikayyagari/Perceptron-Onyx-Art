import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_req, reply) => {
    const checks: Record<string, 'ok' | 'error'> = {
      api: 'ok',
      database: 'ok',
      redis: 'ok',
    }

    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      checks['database'] = 'error'
    }

    try {
      await redis.ping()
    } catch {
      checks['redis'] = 'error'
    }

    const healthy = Object.values(checks).every((s) => s === 'ok')
    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    })
  })
}
