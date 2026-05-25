import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { GalleryStaffRole } from '@perceptron/shared'
import { prisma } from '../../../lib/prisma'
import { requireSuperAdmin } from '../../../middleware/require-super-admin'
import { hashPassword } from '../../../services/auth.service'

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(GalleryStaffRole),
  galleryId: z.string().uuid().nullable().optional(),
})

const updateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.nativeEnum(GalleryStaffRole).optional(),
  galleryId: z.string().uuid().nullable().optional(),
})

function formatStaff(s: { id: string; email: string; role: string; galleryId: string | null; createdAt: Date; lastLoginAt: Date | null }) {
  return {
    id: s.id,
    email: s.email,
    role: s.role,
    galleryId: s.galleryId,
    createdAt: s.createdAt.toISOString(),
    lastLoginAt: s.lastLoginAt?.toISOString() ?? null,
  }
}

export async function adminStaffRoutes(fastify: FastifyInstance) {
  // All staff routes are super-admin only
  fastify.addHook('onRequest', requireSuperAdmin)

  fastify.get('/', async (req) => {
    const { galleryId } = req.query as { galleryId?: string }
    const staff = await prisma.galleryStaff.findMany({
      where: galleryId ? { galleryId } : {},
      orderBy: { email: 'asc' },
    })
    return staff.map(formatStaff)
  })

  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const staff = await prisma.galleryStaff.findUnique({ where: { id } })
    if (!staff) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Staff not found' })
    return formatStaff(staff)
  })

  fastify.post('/', async (req, reply) => {
    const body = createSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    if (body.data.role !== GalleryStaffRole.SUPER_ADMIN && !body.data.galleryId) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'galleryId is required for non-super-admin staff' })
    }

    const existing = await prisma.galleryStaff.findUnique({ where: { email: body.data.email } })
    if (existing) {
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'Email already in use' })
    }

    const passwordHash = await hashPassword(body.data.password)
    const staff = await prisma.galleryStaff.create({
      data: {
        email: body.data.email,
        passwordHash,
        role: body.data.role,
        galleryId: body.data.galleryId ?? null,
      },
    })
    return reply.status(201).send(formatStaff(staff))
  })

  fastify.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.issues[0]?.message })
    }

    const existing = await prisma.galleryStaff.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Staff not found' })

    const updateData: Record<string, unknown> = {}
    if (body.data.email) updateData['email'] = body.data.email
    if (body.data.password) updateData['passwordHash'] = await hashPassword(body.data.password)
    if (body.data.role) updateData['role'] = body.data.role
    if ('galleryId' in body.data) updateData['galleryId'] = body.data.galleryId

    const staff = await prisma.galleryStaff.update({ where: { id }, data: updateData })
    return formatStaff(staff)
  })

  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    // Prevent deleting yourself
    if (id === req.adminUser!.id) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Cannot delete your own account' })
    }

    const existing = await prisma.galleryStaff.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Staff not found' })

    await prisma.galleryStaff.delete({ where: { id } })
    return reply.status(204).send()
  })
}
