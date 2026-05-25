import type { FastifyInstance } from 'fastify'
import { adminAuthRoutes } from './auth.routes'
import { adminGalleriesRoutes } from './galleries.routes'
import { adminPaintingsRoutes } from './paintings.routes'
import { adminArtistsRoutes } from './artists.routes'
import { adminStaffRoutes } from './staff.routes'
import { adminInquiriesRoutes } from './inquiries.routes'
import { adminAnalyticsRoutes } from './analytics.routes'
import { requireAdmin } from '../../../middleware/require-admin'

export async function adminRoutes(fastify: FastifyInstance) {
  // Auth routes are NOT gated — login and refresh must be public
  fastify.register(adminAuthRoutes, { prefix: '/auth' })

  // All other admin routes require admin authentication
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', requireAdmin)
    protectedRoutes.register(adminGalleriesRoutes, { prefix: '/galleries' })
    protectedRoutes.register(adminPaintingsRoutes, { prefix: '/paintings' })
    protectedRoutes.register(adminArtistsRoutes, { prefix: '/artists' })
    protectedRoutes.register(adminStaffRoutes, { prefix: '/staff' })
    protectedRoutes.register(adminInquiriesRoutes, { prefix: '/inquiries' })
    protectedRoutes.register(adminAnalyticsRoutes, { prefix: '/analytics' })
  })
}
