import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/require-auth'
import { prisma } from '../../lib/prisma'
import { getSavedPaintings, savePainting, unsavePainting } from '../../services/painting.service'
import { z } from 'zod'

const savePaintingSchema = z.object({
  paintingId: z.string().uuid(),
})

export async function meRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', requireAuth)

  fastify.get('/', async (req) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.currentUser!.id },
      select: {
        id: true,
        email: true,
        authProvider: true,
        displayName: true,
        firstGalleryId: true,
        createdAt: true,
        lastActiveAt: true,
      },
    })
    return {
      id: user.id,
      email: user.email,
      authProvider: user.authProvider,
      displayName: user.displayName,
      firstGalleryId: user.firstGalleryId,
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: user.lastActiveAt.toISOString(),
    }
  })

  fastify.get('/saved-paintings', async (req) => {
    return getSavedPaintings(req.currentUser!.id)
  })

  fastify.post('/saved-paintings', async (req, reply) => {
    const body = savePaintingSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    // Verify painting exists
    const painting = await prisma.painting.findUnique({ where: { id: body.data.paintingId }, select: { id: true } })
    if (!painting) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Painting not found' })
    }

    await savePainting(req.currentUser!.id, body.data.paintingId)
    return reply.status(201).send({ message: 'Saved' })
  })

  fastify.delete('/saved-paintings/:paintingId', async (req) => {
    const { paintingId } = req.params as { paintingId: string }
    await unsavePainting(req.currentUser!.id, paintingId)
    return { message: 'Removed' }
  })
}
