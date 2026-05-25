import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import { requireSuperAdmin } from '../../../middleware/require-super-admin'
import { getPublicUrl } from '../../../lib/s3'
import { uploadArtistPortrait, deleteStorageObject } from '../../../services/storage.service'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  bio: z.string().min(1),
  birthYear: z.number().int().min(1000).max(new Date().getFullYear()).optional(),
  deathYear: z.number().int().min(1000).max(new Date().getFullYear()).optional(),
  nationality: z.string().max(100).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  bio: z.string().min(1).optional(),
  birthYear: z.number().int().nullable().optional(),
  deathYear: z.number().int().nullable().optional(),
  nationality: z.string().max(100).nullable().optional(),
})

function formatArtist(a: { id: string; name: string; slug: string; bio: string; birthYear: number | null; deathYear: number | null; nationality: string | null; portraitImage: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: a.id,
    name: a.name,
    slug: a.slug,
    bio: a.bio,
    birthYear: a.birthYear,
    deathYear: a.deathYear,
    nationality: a.nationality,
    portraitImageUrl: a.portraitImage ? getPublicUrl(a.portraitImage) : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}

export async function adminArtistsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (req) => {
    const { search } = req.query as { search?: string }
    const artists = await prisma.artist.findMany({
      where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { nationality: { contains: search, mode: 'insensitive' } }] } : {},
      orderBy: { name: 'asc' },
    })
    return artists.map(formatArtist)
  })

  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const artist = await prisma.artist.findUnique({ where: { id } })
    if (!artist) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Artist not found' })
    return formatArtist(artist)
  })

  fastify.post('/', { onRequest: [requireSuperAdmin] }, async (req, reply) => {
    const body = createSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const existing = await prisma.artist.findUnique({ where: { slug: body.data.slug } })
    if (existing) {
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'Artist with this slug already exists' })
    }

    const artist = await prisma.artist.create({ data: body.data })
    return reply.status(201).send(formatArtist(artist))
  })

  fastify.patch('/:id', { onRequest: [requireSuperAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const existing = await prisma.artist.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Artist not found' })

    if (body.data.slug && body.data.slug !== existing.slug) {
      const slugTaken = await prisma.artist.findUnique({ where: { slug: body.data.slug } })
      if (slugTaken) {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'Slug already in use' })
      }
    }

    const artist = await prisma.artist.update({ where: { id }, data: body.data })
    return formatArtist(artist)
  })

  fastify.delete('/:id', { onRequest: [requireSuperAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.artist.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Artist not found' })

    if (existing.portraitImage) {
      await deleteStorageObject(existing.portraitImage).catch(() => undefined)
    }

    await prisma.artist.delete({ where: { id } })
    return reply.status(204).send()
  })

  fastify.post('/:id/portrait', { onRequest: [requireSuperAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.artist.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Artist not found' })

    const file = await req.file()
    if (!file) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'No file uploaded' })

    if (existing.portraitImage) {
      await deleteStorageObject(existing.portraitImage).catch(() => undefined)
    }

    const key = await uploadArtistPortrait(file, id)
    const artist = await prisma.artist.update({ where: { id }, data: { portraitImage: key } })
    return formatArtist(artist)
  })
}
