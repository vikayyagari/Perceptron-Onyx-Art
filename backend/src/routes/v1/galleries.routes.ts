import type { FastifyInstance } from 'fastify'
import { listGalleries, getGallery } from '../../services/gallery.service'

export async function galleriesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return listGalleries()
  })

  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const gallery = await getGallery(id)
    if (!gallery) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Gallery not found' })
    }
    return gallery
  })
}
