import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { InquiryStatus } from '@perceptron/shared'
import { prisma } from '../../../lib/prisma'
import { assertAdminGalleryFilter } from '../../../middleware/gallery-scope'

const listQuerySchema = z.object({
  galleryId: z.string().uuid().optional(),
  status: z.nativeEnum(InquiryStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const updateStatusSchema = z.object({
  status: z.nativeEnum(InquiryStatus),
})

function formatInquiry(i: { id: string; paintingId: string; galleryId: string; message: string; contactEmail: string; contactPhone: string | null; status: string; createdAt: Date }) {
  return {
    id: i.id,
    paintingId: i.paintingId,
    galleryId: i.galleryId,
    message: i.message,
    contactEmail: i.contactEmail,
    contactPhone: i.contactPhone,
    status: i.status,
    createdAt: i.createdAt.toISOString(),
  }
}

export async function adminInquiriesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (req, reply) => {
    const q = listQuerySchema.safeParse(req.query)
    if (!q.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: q.error.issues[0]?.message })
    }

    const galleryId = assertAdminGalleryFilter(req, q.data.galleryId)
    const skip = (q.data.page - 1) * q.data.limit

    const where = {
      ...(galleryId && { galleryId }),
      ...(q.data.status && { status: q.data.status }),
    }

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: q.data.limit }),
      prisma.inquiry.count({ where }),
    ])

    return {
      data: inquiries.map(formatInquiry),
      total,
      page: q.data.page,
      limit: q.data.limit,
      totalPages: Math.ceil(total / q.data.limit),
    }
  })

  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const inquiry = await prisma.inquiry.findUnique({ where: { id } })
    if (!inquiry) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Inquiry not found' })

    const admin = req.adminUser!
    if (admin.role !== 'SUPER_ADMIN' && admin.galleryId !== inquiry.galleryId) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Access denied' })
    }

    return formatInquiry(inquiry)
  })

  fastify.patch('/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateStatusSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const inquiry = await prisma.inquiry.findUnique({ where: { id } })
    if (!inquiry) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Inquiry not found' })

    const admin = req.adminUser!
    if (admin.role !== 'SUPER_ADMIN' && admin.galleryId !== inquiry.galleryId) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Access denied' })
    }

    const updated = await prisma.inquiry.update({ where: { id }, data: { status: body.data.status } })
    return formatInquiry(updated)
  })
}
