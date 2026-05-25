import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  authenticateWithApple,
  authenticateWithGoogle,
  createGuestUser,
  requestPhoneOtp,
  verifyPhoneOtp,
} from '../../services/auth.service'
import { issueCustomerTokens, rotateRefreshToken } from '../../lib/jwt'
import { prisma } from '../../lib/prisma'
import { config } from '../../config'

const appleSchema = z.object({
  identityToken: z.string().min(1),
  authorizationCode: z.string().min(1),
  displayName: z.string().optional(),
  galleryId: z.string().uuid().optional(),
})

const googleSchema = z.object({
  idToken: z.string().min(1),
  displayName: z.string().optional(),
  galleryId: z.string().uuid().optional(),
})

const guestSchema = z.object({
  galleryId: z.string().uuid().optional(),
})

const phoneRequestSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  galleryId: z.string().uuid().optional(),
})

const phoneVerifySchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  code: z.string().length(6),
  galleryId: z.string().uuid().optional(),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export async function authRoutes(fastify: FastifyInstance) {
  const authRateLimit = {
    config: { rateLimit: { max: config.RATE_LIMIT_AUTH_MAX, timeWindow: '1 minute' } },
  }

  fastify.post('/apple', { ...authRateLimit }, async (req, reply) => {
    const body = appleSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const user = await authenticateWithApple(
      body.data.identityToken,
      body.data.displayName,
      body.data.galleryId,
    )
    const tokens = await issueCustomerTokens(fastify, user.id)
    return { ...tokens, user: formatUser(user) }
  })

  fastify.post('/google', { ...authRateLimit }, async (req, reply) => {
    const body = googleSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const user = await authenticateWithGoogle(
      body.data.idToken,
      body.data.displayName,
      body.data.galleryId,
    )
    const tokens = await issueCustomerTokens(fastify, user.id)
    return { ...tokens, user: formatUser(user) }
  })

  fastify.post('/guest', { ...authRateLimit }, async (req, reply) => {
    const body = guestSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const user = await createGuestUser(body.data.galleryId)
    const tokens = await issueCustomerTokens(fastify, user.id)
    return { ...tokens, user: formatUser(user) }
  })

  fastify.post('/phone/request', { ...authRateLimit }, async (req, reply) => {
    const body = phoneRequestSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    await requestPhoneOtp(body.data.phoneNumber)
    return reply.status(202).send({ message: 'OTP sent' })
  })

  fastify.post('/phone/verify', { ...authRateLimit }, async (req, reply) => {
    const body = phoneVerifySchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const user = await verifyPhoneOtp(body.data.phoneNumber, body.data.code, body.data.galleryId)
    if (!user) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired OTP' })
    }

    const tokens = await issueCustomerTokens(fastify, user.id)
    return { ...tokens, user: formatUser(user) }
  })

  fastify.post('/refresh', async (req, reply) => {
    const body = refreshSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'refreshToken is required' })
    }

    const result = await rotateRefreshToken(fastify, body.data.refreshToken)
    if (!result) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired refresh token' })
    }

    const user = await prisma.user.findUnique({
      where: { id: result.payload.sub },
      select: { id: true, email: true, displayName: true, authProvider: true, firstGalleryId: true, createdAt: true, lastActiveAt: true },
    })

    if (!user) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'User not found' })
    }

    return { accessToken: result.accessToken, refreshToken: result.refreshToken, user: formatUser(user) }
  })
}

function formatUser(user: { id: string; email: string | null; authProvider: string; displayName: string | null; firstGalleryId: string | null; createdAt: Date; lastActiveAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    authProvider: user.authProvider,
    displayName: user.displayName,
    firstGalleryId: user.firstGalleryId,
    createdAt: user.createdAt.toISOString(),
    lastActiveAt: user.lastActiveAt.toISOString(),
  }
}
