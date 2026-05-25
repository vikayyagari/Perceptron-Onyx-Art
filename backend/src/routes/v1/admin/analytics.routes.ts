import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import { assertAdminGalleryFilter } from '../../../middleware/gallery-scope'

const overviewQuerySchema = z.object({
  galleryId: z.string().uuid().optional(),
  days: z.coerce.number().int().positive().max(365).default(30),
})

export async function adminAnalyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/overview', async (req, reply) => {
    const q = overviewQuerySchema.safeParse(req.query)
    if (!q.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: q.error.issues[0]?.message })
    }

    const galleryId = assertAdminGalleryFilter(req, q.data.galleryId)
    const since = new Date(Date.now() - q.data.days * 24 * 60 * 60 * 1000)

    const galleryFilter = galleryId ? { galleryId } : {}
    const sinceFilter = { createdAt: { gte: since } }

    const [
      totalScans,
      totalVisualizations,
      totalSavedPaintings,
      totalInquiries,
      scansByQr,
      scansByCV,
      vizByAr,
      vizByPhoto,
      topPaintingsRaw,
      recentInquiries,
    ] = await Promise.all([
      prisma.scanEvent.count({ where: { ...galleryFilter, ...sinceFilter } }),
      prisma.visualizationEvent.count({ where: { ...sinceFilter } }),
      prisma.savedPainting.count(),
      prisma.inquiry.count({ where: { ...galleryFilter, ...sinceFilter } }),
      prisma.scanEvent.count({ where: { ...galleryFilter, ...sinceFilter, method: 'QR' } }),
      prisma.scanEvent.count({ where: { ...galleryFilter, ...sinceFilter, method: 'COMPUTER_VISION' } }),
      prisma.visualizationEvent.count({ where: { ...sinceFilter, mode: 'AR' } }),
      prisma.visualizationEvent.count({ where: { ...sinceFilter, mode: 'PHOTO_UPLOAD' } }),
      prisma.scanEvent.groupBy({
        by: ['paintingId'],
        where: { ...galleryFilter, ...sinceFilter },
        _count: { paintingId: true },
        orderBy: { _count: { paintingId: 'desc' } },
        take: 5,
      }),
      prisma.inquiry.findMany({
        where: { ...galleryFilter, ...sinceFilter },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    // Enrich top paintings with titles
    const topPaintingIds = topPaintingsRaw.map((r) => r.paintingId)
    const topPaintingDetails = await prisma.painting.findMany({
      where: { id: { in: topPaintingIds } },
      select: { id: true, title: true },
    })
    const titleMap = new Map(topPaintingDetails.map((p) => [p.id, p.title]))

    return {
      totalScans,
      totalVisualizations,
      totalSavedPaintings,
      totalInquiries,
      scansByMethod: { QR: scansByQr, COMPUTER_VISION: scansByCV },
      visualizationsByMode: { AR: vizByAr, PHOTO_UPLOAD: vizByPhoto },
      topPaintings: topPaintingsRaw.map((r) => ({
        paintingId: r.paintingId,
        title: titleMap.get(r.paintingId) ?? 'Unknown',
        scans: r._count.paintingId,
      })),
      recentInquiries: recentInquiries.map((i) => ({
        id: i.id,
        paintingId: i.paintingId,
        galleryId: i.galleryId,
        message: i.message,
        contactEmail: i.contactEmail,
        contactPhone: i.contactPhone,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
      })),
    }
  })
}
