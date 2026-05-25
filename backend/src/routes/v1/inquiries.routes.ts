import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../../middleware/require-auth'
import { prisma } from '../../lib/prisma'

const createInquirySchema = z.object({
  paintingId: z.string().uuid(),
  galleryId: z.string().uuid(),
  message: z.string().min(10).max(2000),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
})

export async function inquiriesRoutes(fastify: FastifyInstance) {
  fastify.post('/', { onRequest: [requireAuth] }, async (req, reply) => {
    const body = createInquirySchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    // Validate painting and gallery exist
    const painting = await prisma.painting.findUnique({
      where: { id: body.data.paintingId },
      select: { id: true, galleryId: true },
    })
    if (!painting) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Painting not found' })
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        userId: req.currentUser!.id,
        paintingId: body.data.paintingId,
        galleryId: body.data.galleryId,
        message: body.data.message,
        contactEmail: body.data.contactEmail,
        contactPhone: body.data.contactPhone ?? null,
      },
    })

    return reply.status(201).send({
      id: inquiry.id,
      paintingId: inquiry.paintingId,
      galleryId: inquiry.galleryId,
      message: inquiry.message,
      contactEmail: inquiry.contactEmail,
      contactPhone: inquiry.contactPhone,
      status: inquiry.status,
      createdAt: inquiry.createdAt.toISOString(),
    })
  })
}
