/**
 * Integration tests for painting CRUD endpoints.
 */
import { buildApp } from '../../app'
import { prisma } from '../../lib/prisma'
import { redis } from '../../lib/redis'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let adminToken: string
let galleryId: string
let artistId: string

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  // Clean state
  await prisma.savedPainting.deleteMany()
  await prisma.scanEvent.deleteMany()
  await prisma.visualizationEvent.deleteMany()
  await prisma.inquiry.deleteMany()
  await prisma.painting.deleteMany()
  await prisma.artist.deleteMany()
  await prisma.galleryStaff.deleteMany()
  await prisma.user.deleteMany()
  await prisma.gallery.deleteMany()

  // Create test gallery
  const gallery = await prisma.gallery.create({
    data: {
      name: 'Test Gallery',
      address: '1 Test Street',
      city: 'Testville',
      country: 'US',
      timezone: 'UTC',
      contactEmail: 'test@gallery.com',
    },
  })
  galleryId = gallery.id

  // Create test artist
  const artist = await prisma.artist.create({
    data: { name: 'Test Artist', slug: 'test-artist', bio: 'A test artist', nationality: 'Test' },
  })
  artistId = artist.id

  // Create super admin
  const bcrypt = await import('bcryptjs')
  const hash = await bcrypt.default.hash('AdminPass123!', 12)
  await prisma.galleryStaff.create({
    data: { email: 'paintings-admin@test.com', passwordHash: hash, role: 'SUPER_ADMIN', galleryId: null },
  })

  const loginRes = await app.inject({
    method: 'POST',
    url: '/v1/admin/auth/login',
    body: { email: 'paintings-admin@test.com', password: 'AdminPass123!' },
  })
  adminToken = loginRes.json().accessToken
})

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
  redis.disconnect()
})

describe('GET /v1/paintings', () => {
  it('returns empty list when no paintings exist', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/paintings' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(0)
    expect(body.total).toBe(0)
  })

  it('supports galleryId filter', async () => {
    const res = await app.inject({ method: 'GET', url: `/v1/paintings?galleryId=${galleryId}` })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(0)
  })
})

describe('Admin painting CRUD', () => {
  let paintingId: string

  it('POST /v1/admin/paintings — creates a painting', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/paintings',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        galleryId,
        artistId,
        title: 'Integration Test Painting',
        year: 2024,
        medium: 'Oil on canvas',
        widthCm: 100,
        heightCm: 80,
        price: '5000',
        currency: 'USD',
        description: 'A painting created during integration tests.',
        status: 'AVAILABLE',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.title).toBe('Integration Test Painting')
    expect(body.artist.name).toBe('Test Artist')
    paintingId = body.id
  })

  it('GET /v1/paintings — returns the created painting', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/paintings' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(1)
  })

  it('GET /v1/paintings/:id — returns painting details', async () => {
    const res = await app.inject({ method: 'GET', url: `/v1/paintings/${paintingId}` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(paintingId)
    expect(body.artist).toHaveProperty('name', 'Test Artist')
  })

  it('GET /v1/paintings/by-qr/:qrCodeId — lookup by QR', async () => {
    const painting = await prisma.painting.findUnique({ where: { id: paintingId }, select: { qrCodeId: true } })
    const res = await app.inject({ method: 'GET', url: `/v1/paintings/by-qr/${painting!.qrCodeId}` })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe(paintingId)
  })

  it('PATCH /v1/admin/paintings/:id — updates a painting', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/admin/paintings/${paintingId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { title: 'Updated Title', status: 'SOLD' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.title).toBe('Updated Title')
    expect(body.status).toBe('SOLD')
  })

  it('DELETE /v1/admin/paintings/:id — deletes a painting', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/admin/paintings/${paintingId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(204)
  })

  it('GET /v1/paintings — returns empty after delete', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/paintings' })
    expect(res.json().data).toHaveLength(0)
  })
})

describe('Saved paintings', () => {
  let paintingId: string
  let userToken: string

  beforeAll(async () => {
    // Create a painting to save
    const painting = await prisma.painting.create({
      data: {
        galleryId,
        artistId,
        title: 'Saveable Painting',
        widthCm: 50,
        heightCm: 50,
        currency: 'USD',
        description: 'For save test',
        primaryImage: 'paintings/placeholder.jpg',
        status: 'AVAILABLE',
      },
    })
    paintingId = painting.id

    // Create a user
    const guestRes = await app.inject({ method: 'POST', url: '/v1/auth/guest', body: {} })
    userToken = guestRes.json().accessToken
  })

  it('POST /v1/me/saved-paintings — saves a painting', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/me/saved-paintings',
      headers: { Authorization: `Bearer ${userToken}` },
      body: { paintingId },
    })
    expect(res.statusCode).toBe(201)
  })

  it('GET /v1/me/saved-paintings — returns saved paintings', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me/saved-paintings',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })

  it('DELETE /v1/me/saved-paintings/:id — removes saved painting', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/me/saved-paintings/${paintingId}`,
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(res.statusCode).toBe(200)
  })

  it('GET /v1/me/saved-paintings — empty after removal', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me/saved-paintings',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(res.json()).toHaveLength(0)
  })
})
