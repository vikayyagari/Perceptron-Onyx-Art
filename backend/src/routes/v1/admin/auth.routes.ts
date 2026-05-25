import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { GalleryStaffRole } from '@perceptron/shared'
import { authenticateAdmin } from '../../../services/auth.service'
import { issueAdminTokens, rotateRefreshToken, revokeAllRefreshTokens } from '../../../lib/jwt'
import { requireAdmin } from '../../../middleware/require-admin'
import { prisma } from '../../../lib/prisma'
import { config } from '../../../config'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export async function adminAuthRoutes(fastify: FastifyInstance) {
  const authRateLimit = {
    config: { rateLimit: { max: config.RATE_LIMIT_AUTH_MAX, timeWindow: '1 minute' } },
  }

  fastify.post('/login', { ...authRateLimit }, async (req, reply) => {
    const body = loginSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const staff = await authenticateAdmin(body.data.email, body.data.password)
    if (!staff) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid credentials' })
    }

    const tokens = await issueAdminTokens(fastify, staff.id, staff.role as GalleryStaffRole, staff.galleryId)
    return {
      ...tokens,
      staff: formatStaff(staff),
    }
  })

  fastify.post('/refresh', async (req, reply) => {
    const body = refreshSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'refreshToken is required' })
    }

    const partial = await rotateRefreshToken(fastify, body.data.refreshToken)
    if (!partial || partial.payload.tokenType !== 'admin') {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired refresh token' })
    }

    const staff = await prisma.galleryStaff.findUnique({ where: { id: partial.payload.sub } })
    if (!staff) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Staff not found' })
    }

    const tokens = await issueAdminTokens(fastify, staff.id, staff.role as GalleryStaffRole, staff.galleryId)
    return { ...tokens, staff: formatStaff(staff) }
  })

  fastify.post('/logout', { onRequest: [requireAdmin] }, async (req) => {
    await revokeAllRefreshTokens(req.adminUser!.id)
    return { message: 'Logged out' }
  })

  fastify.get('/me', { onRequest: [requireAdmin] }, async (req) => {
    const staff = await prisma.galleryStaff.findUniqueOrThrow({
      where: { id: req.adminUser!.id },
    })
    return formatStaff(staff)
  })
}

function formatStaff(s: { id: string; email: string; role: string; galleryId: string | null; createdAt: Date; lastLoginAt: Date | null }) {
  return {
    id: s.id,
    email: s.email,
    role: s.role,
    galleryId: s.galleryId,
    createdAt: s.createdAt.toISOString(),
    lastLoginAt: s.lastLoginAt?.toISOString() ?? null,
  }
}
