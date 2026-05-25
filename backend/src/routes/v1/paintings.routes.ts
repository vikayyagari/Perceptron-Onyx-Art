import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PaintingStatus } from '@perceptron/shared'
import { listPaintings, getPainting, getPaintingByQrCode } from '../../services/painting.service'

const listQuerySchema = z.object({
  galleryId: z.string().uuid().optional(),
  artistId: z.string().uuid().optional(),
  status: z.nativeEnum(PaintingStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export async function paintingsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (req, reply) => {
    const query = listQuerySchema.safeParse(req.query)
    if (!query.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: query.error.issues[0]?.message })
    }
    return listPaintings(query.data as Parameters<typeof listPaintings>[0])
  })

  // Must be before /:id to avoid being matched as id="by-qr"
  fastify.get('/by-qr/:qrCodeId', async (req, reply) => {
    const { qrCodeId } = req.params as { qrCodeId: string }
    const painting = await getPaintingByQrCode(qrCodeId)
    if (!painting) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Painting not found' })
    }
    return painting
  })

  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const painting = await getPainting(id)
    if (!painting) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Painting not found' })
    }
    return painting
  })
}
