import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { PaintingStatus } from '@perceptron/shared'
import { prisma } from '../../../lib/prisma'
import { requireGalleryAccess, assertAdminGalleryFilter } from '../../../middleware/gallery-scope'
import { formatPaintingPublic, formatPaintingListItem } from '../../../services/painting.service'
import { uploadPaintingImage, deleteStorageObject } from '../../../services/storage.service'
import QRCode from 'qrcode'
import PDFDocument from 'pdfkit'

const createSchema = z.object({
  galleryId: z.string().uuid(),
  artistId: z.string().uuid(),
  title: z.string().min(1).max(500),
  year: z.number().int().min(0).max(new Date().getFullYear() + 1).optional(),
  medium: z.string().max(200).optional(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  depthCm: z.number().positive().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().length(3).default('USD'),
  description: z.string().min(1),
  provenance: z.string().optional(),
  dominantColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  status: z.nativeEnum(PaintingStatus).default(PaintingStatus.AVAILABLE),
})

const updateSchema = z.object({
  artistId: z.string().uuid().optional(),
  title: z.string().min(1).max(500).optional(),
  year: z.number().int().nullable().optional(),
  medium: z.string().max(200).nullable().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  depthCm: z.number().positive().nullable().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  currency: z.string().length(3).optional(),
  description: z.string().min(1).optional(),
  provenance: z.string().nullable().optional(),
  dominantColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  status: z.nativeEnum(PaintingStatus).optional(),
})

const listQuerySchema = z.object({
  galleryId: z.string().uuid().optional(),
  artistId: z.string().uuid().optional(),
  status: z.nativeEnum(PaintingStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export async function adminPaintingsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (req, reply) => {
    const q = listQuerySchema.safeParse(req.query)
    if (!q.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: q.error.issues[0]?.message })
    }
    const galleryId = assertAdminGalleryFilter(req, q.data.galleryId)
    const skip = (q.data.page - 1) * q.data.limit

    const where = {
      ...(galleryId && { galleryId }),
      ...(q.data.artistId && { artistId: q.data.artistId }),
      ...(q.data.status && { status: q.data.status }),
      ...(q.data.search && {
        OR: [
          { title: { contains: q.data.search, mode: 'insensitive' as const } },
          { artist: { name: { contains: q.data.search, mode: 'insensitive' as const } } },
        ],
      }),
    }

    const [paintings, total] = await Promise.all([
      prisma.painting.findMany({ where, include: { artist: true }, orderBy: { createdAt: 'desc' }, skip, take: q.data.limit }),
      prisma.painting.count({ where }),
    ])

    return {
      data: paintings.map(formatPaintingListItem),
      total,
      page: q.data.page,
      limit: q.data.limit,
      totalPages: Math.ceil(total / q.data.limit),
    }
  })

  fastify.get('/:id', {
    onRequest: [requireGalleryAccess((req) => {
      // We'll check gallery after fetching — just verify admin role here
      return undefined
    })],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const painting = await prisma.painting.findUnique({ where: { id }, include: { artist: true } })
    if (!painting) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Painting not found' })

    // Gallery staff can only see their gallery's paintings
    const admin = req.adminUser!
    if (admin.role !== 'SUPER_ADMIN' && admin.galleryId !== painting.galleryId) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Access denied' })
    }

    return formatPaintingPublic(painting)
  })

  fastify.post('/', {
    onRequest: [requireGalleryAccess((req) => (req.body as { galleryId?: string }).galleryId)],
  }, async (req, reply) => {
    const body = createSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const artist = await prisma.artist.findUnique({ where: { id: body.data.artistId }, select: { id: true } })
    if (!artist) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Artist not found' })

    const painting = await prisma.painting.create({
      data: {
        ...body.data,
        // primaryImage defaults to placeholder until image is uploaded
        primaryImage: `paintings/placeholder.jpg`,
        price: body.data.price ? new Decimal(body.data.price) : null,
      },
      include: { artist: true },
    })
    return reply.status(201).send(formatPaintingPublic(painting))
  })

  fastify.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const existing = await prisma.painting.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Painting not found' })

    const admin = req.adminUser!
    if (admin.role !== 'SUPER_ADMIN' && admin.galleryId !== existing.galleryId) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Access denied' })
    }

    const painting = await prisma.painting.update({
      where: { id },
      data: {
        ...body.data,
        price: body.data.price !== undefined
          ? (body.data.price !== null ? new Decimal(body.data.price) : null)
          : undefined,
      },
      include: { artist: true },
    })
    return formatPaintingPublic(painting)
  })

  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.painting.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Painting not found' })

    const admin = req.adminUser!
    if (admin.role !== 'SUPER_ADMIN' && admin.galleryId !== existing.galleryId) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Access denied' })
    }

    if (existing.primaryImage && existing.primaryImage !== 'paintings/placeholder.jpg') {
      await deleteStorageObject(existing.primaryImage).catch(() => undefined)
    }

    await prisma.painting.delete({ where: { id } })
    return reply.status(204).send()
  })

  fastify.post('/:id/image', async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.painting.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Painting not found' })

    const admin = req.adminUser!
    if (admin.role !== 'SUPER_ADMIN' && admin.galleryId !== existing.galleryId) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Access denied' })
    }

    const file = await req.file()
    if (!file) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'No file uploaded' })

    // Delete old image unless it's the placeholder
    if (existing.primaryImage && existing.primaryImage !== 'paintings/placeholder.jpg') {
      await deleteStorageObject(existing.primaryImage).catch(() => undefined)
    }

    const key = await uploadPaintingImage(file, id)

    // Stub: embedding generation would be triggered here in Phase 6
    // embeddings.generateAndStore(id, key).catch(log.error)

    const painting = await prisma.painting.update({
      where: { id },
      data: { primaryImage: key },
      include: { artist: true },
    })
    return formatPaintingPublic(painting)
  })

  fastify.get('/:id/qr', async (req, reply) => {
    const { id } = req.params as { id: string }
    const painting = await prisma.painting.findUnique({
      where: { id },
      select: { id: true, qrCodeId: true, title: true, galleryId: true },
    })
    if (!painting) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Painting not found' })

    const admin = req.adminUser!
    if (admin.role !== 'SUPER_ADMIN' && admin.galleryId !== painting.galleryId) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Access denied' })
    }

    // Generate QR code encoding the deep link
    const deepLink = `perceptrongallery://scan?qr=${painting.qrCodeId}`
    const qrDataUrl = await QRCode.toDataURL(deepLink, { width: 300, margin: 2 })
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1] ?? '', 'base64')

    // Generate PDF with QR code + painting title
    const doc = new PDFDocument({ size: 'A5', margin: 40 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))

    await new Promise<void>((resolve) => {
      doc.on('end', resolve)
      doc.fontSize(16).font('Helvetica-Bold').text('Perceptron Gallery', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(12).font('Helvetica').text(painting.title, { align: 'center' })
      doc.moveDown(1)
      doc.image(qrBuffer, { fit: [200, 200], align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(10).fillColor('#666').text(`Scan to view artwork details`, { align: 'center' })
      doc.end()
    })

    const pdf = Buffer.concat(chunks)
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="qr-${painting.qrCodeId}.pdf"`)
      .send(pdf)
  })
}
