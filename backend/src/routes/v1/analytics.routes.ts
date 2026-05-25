import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ScanMethod, VisualizationMode } from '@perceptron/shared'
import { requireAuth } from '../../middleware/require-auth'
import { prisma } from '../../lib/prisma'

const scanSchema = z.object({
  paintingId: z.string().uuid(),
  galleryId: z.string().uuid(),
  method: z.nativeEnum(ScanMethod),
})

const visualizationSchema = z.object({
  paintingId: z.string().uuid(),
  mode: z.nativeEnum(VisualizationMode),
  frameStyle: z.string().optional(),
})

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.post('/scan', async (req, reply) => {
    const body = scanSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    // userId is optional — guest scans are allowed
    const userId = req.currentUser?.id ?? null
    if (req.headers.authorization) {
      try {
        await req.jwtVerify()
        const payload = req.user
        if (payload.type === 'customer') {
          // already set by requireAuth if called upstream, or re-decode here
        }
      } catch {
        // anonymous scan — no userId
      }
    }

    await prisma.scanEvent.create({
      data: {
        userId,
        paintingId: body.data.paintingId,
        galleryId: body.data.galleryId,
        method: body.data.method,
      },
    })

    return reply.status(201).send({ message: 'Scan recorded' })
  })

  fastify.post('/visualization', { onRequest: [requireAuth] }, async (req, reply) => {
    const body = visualizationSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    await prisma.visualizationEvent.create({
      data: {
        userId: req.currentUser!.id,
        paintingId: body.data.paintingId,
        mode: body.data.mode,
        frameStyle: body.data.frameStyle ?? null,
      },
    })

    return reply.status(201).send({ message: 'Visualization recorded' })
  })
}
