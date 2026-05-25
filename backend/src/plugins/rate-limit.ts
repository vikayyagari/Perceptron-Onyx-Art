import fp from 'fastify-plugin'
import rateLimitPlugin from '@fastify/rate-limit'
import { redis } from '../lib/redis'
import { config } from '../config'

export default fp(async (fastify) => {
  await fastify.register(rateLimitPlugin, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (req) => {
      return req.headers['x-forwarded-for']?.toString() ?? req.ip
    },
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry after ${Math.ceil(context.ttl / 1000)}s`,
    }),
  })
})
