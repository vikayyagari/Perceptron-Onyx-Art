import fp from 'fastify-plugin'
import corsPlugin from '@fastify/cors'
import { config } from '../config'

export default fp(async (fastify) => {
  const origins = config.CORS_ORIGIN.split(',').map((o) => o.trim())
  const origin = (origins.length === 1 ? origins[0] : origins) as string | string[]

  await fastify.register(corsPlugin, {
    origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    credentials: true,
    maxAge: 86400,
  })
})
