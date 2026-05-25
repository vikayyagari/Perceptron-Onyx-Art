import type { FastifyRequest, FastifyReply } from 'fastify'
import { GalleryStaffRole } from '@perceptron/shared'
import { prisma } from '../lib/prisma'

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or missing token' })
  }

  const payload = req.user
  if (payload.type !== 'admin') {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Admin token required' })
  }

  const staff = await prisma.galleryStaff.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, galleryId: true },
  })

  if (!staff) {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Staff account not found' })
  }

  req.adminUser = { ...staff, role: staff.role as GalleryStaffRole }
}
