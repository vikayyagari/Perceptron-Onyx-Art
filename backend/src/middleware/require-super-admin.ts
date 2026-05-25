import type { FastifyRequest, FastifyReply } from 'fastify'
import { GalleryStaffRole } from '@perceptron/shared'
import { requireAdmin } from './require-admin'

export async function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireAdmin(req, reply)
  if (reply.sent) return

  if (req.adminUser?.role !== GalleryStaffRole.SUPER_ADMIN) {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Super admin access required',
    })
  }
}
