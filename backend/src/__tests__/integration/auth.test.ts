/**
 * Integration tests for customer and admin auth flows.
 * Requires a running PostgreSQL test database (via docker-compose).
 */
import { buildApp } from '../../app'
import { prisma } from '../../lib/prisma'
import { redis } from '../../lib/redis'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
  // Clean up auth-related tables before test run
  await prisma.savedPainting.deleteMany()
  await prisma.inquiry.deleteMany()
  await prisma.scanEvent.deleteMany()
  await prisma.visualizationEvent.deleteMany()
  await prisma.user.deleteMany()
  await prisma.galleryStaff.deleteMany()
  await prisma.painting.deleteMany()
  await prisma.artist.deleteMany()
  await prisma.gallery.deleteMany()
})

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
  redis.disconnect()
})

describe('POST /v1/auth/guest', () => {
  it('creates a guest user and returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/guest',
      body: {},
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('accessToken')
    expect(body).toHaveProperty('refreshToken')
    expect(body.user).toHaveProperty('id')
    expect(body.user.authProvider).toBe('GUEST')
  })

  it('returns 200 even without galleryId', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/guest', body: {} })
    expect(res.statusCode).toBe(200)
  })
})

describe('POST /v1/auth/refresh', () => {
  it('returns new token pair with valid refresh token', async () => {
    // First create a user
    const guestRes = await app.inject({ method: 'POST', url: '/v1/auth/guest', body: {} })
    const { refreshToken } = guestRes.json()

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      body: { refreshToken },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('accessToken')
    expect(body).toHaveProperty('refreshToken')
    // New tokens should be different from old
    expect(body.refreshToken).not.toBe(refreshToken)
  })

  it('returns 401 for invalid refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      body: { refreshToken: 'invalid.token.here' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when refreshToken is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      body: {},
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /v1/me', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me' })
    expect(res.statusCode).toBe(401)
  })

  it('returns current user with valid token', async () => {
    const guestRes = await app.inject({ method: 'POST', url: '/v1/auth/guest', body: {} })
    const { accessToken } = guestRes.json()

    const res = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('id')
    expect(body.authProvider).toBe('GUEST')
  })
})

describe('Admin auth — POST /v1/admin/auth/login', () => {
  beforeAll(async () => {
    // Create a super admin for testing
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.default.hash('TestAdmin123!', 12)
    await prisma.galleryStaff.create({
      data: {
        email: 'integration-admin@test.com',
        passwordHash: hash,
        role: 'SUPER_ADMIN',
        galleryId: null,
      },
    })
  })

  it('returns tokens on valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/login',
      body: { email: 'integration-admin@test.com', password: 'TestAdmin123!' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('accessToken')
    expect(body.staff.role).toBe('SUPER_ADMIN')
  })

  it('returns 401 on wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/login',
      body: { email: 'integration-admin@test.com', password: 'WrongPassword!' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/login',
      body: { email: 'nobody@test.com', password: 'SomePassword1!' },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /health', () => {
  it('returns healthy status', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('healthy')
    expect(body.checks.api).toBe('ok')
  })
})
