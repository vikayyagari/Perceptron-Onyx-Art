import type { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.routes'
import { meRoutes } from './me.routes'
import { galleriesRoutes } from './galleries.routes'
import { paintingsRoutes } from './paintings.routes'
import { inquiriesRoutes } from './inquiries.routes'
import { analyticsRoutes } from './analytics.routes'
import { adminRoutes } from './admin/index'

export async function v1Routes(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: '/auth' })
  fastify.register(meRoutes, { prefix: '/me' })
  fastify.register(galleriesRoutes, { prefix: '/galleries' })
  fastify.register(paintingsRoutes, { prefix: '/paintings' })
  fastify.register(inquiriesRoutes, { prefix: '/inquiries' })
  fastify.register(analyticsRoutes, { prefix: '/analytics' })
  fastify.register(adminRoutes, { prefix: '/admin' })
}
