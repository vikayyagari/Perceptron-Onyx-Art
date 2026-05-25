import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import { requireSuperAdmin } from '../../../middleware/require-super-admin'
import { requireGalleryAccess } from '../../../middleware/gallery-scope'
import { formatGallery } from '../../../services/gallery.service'
import { uploadGalleryLogo, deleteStorageObject } from '../../../services/storage.service'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1),
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  timezone: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  brandPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

const updateSchema = createSchema.partial()

export async function adminGalleriesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (req) => {
    const admin = req.adminUser!
    const where = admin.role === 'SUPER_ADMIN' ? {} : { id: admin.galleryId ?? '__none__' }
    const galleries = await prisma.gallery.findMany({ where, orderBy: { name: 'asc' } })
    return galleries.map(formatGallery)
  })

  fastify.get('/:id', {
    onRequest: [requireGalleryAccess((req) => (req.params as { id: string }).id)],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const gallery = await prisma.gallery.findUnique({ where: { id } })
    if (!gallery) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Gallery not found' })
    return formatGallery(gallery)
  })

  fastify.post('/', { onRequest: [requireSuperAdmin] }, async (req, reply) => {
    const body = createSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }
    const gallery = await prisma.gallery.create({ data: body.data })
    return reply.status(201).send(formatGallery(gallery))
  })

  fastify.patch('/:id', {
    onRequest: [requireGalleryAccess((req) => (req.params as { id: string }).id)],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const existing = await prisma.gallery.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Gallery not found' })

    const gallery = await prisma.gallery.update({ where: { id }, data: body.data })
    return formatGallery(gallery)
  })

  fastify.delete('/:id', { onRequest: [requireSuperAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.gallery.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Gallery not found' })

    if (existing.brandLogo) {
      await deleteStorageObject(existing.brandLogo).catch(() => undefined)
    }

    await prisma.gallery.delete({ where: { id } })
    return reply.status(204).send()
  })

  fastify.post('/:id/logo', {
    onRequest: [requireGalleryAccess((req) => (req.params as { id: string }).id)],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.gallery.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Gallery not found' })

    const file = await req.file()
    if (!file) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'No file uploaded' })

    if (existing.brandLogo) {
      await deleteStorageObject(existing.brandLogo).catch(() => undefined)
    }

    const key = await uploadGalleryLogo(file, id)
    const gallery = await prisma.gallery.update({ where: { id }, data: { brandLogo: key } })
    return formatGallery(gallery)
  })
}
