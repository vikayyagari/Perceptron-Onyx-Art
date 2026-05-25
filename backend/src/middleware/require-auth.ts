import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or missing token' })
  }

  const payload = req.user
  if (payload.type !== 'customer') {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Customer token required' })
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, displayName: true },
  })

  if (!user) {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'User not found' })
  }

  req.currentUser = user

  // Update lastActiveAt in background — don't await to avoid slowing requests
  prisma.user
    .update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
    .catch(() => undefined)
}
