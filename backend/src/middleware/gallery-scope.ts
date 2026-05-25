import type { FastifyRequest, FastifyReply } from 'fastify'
import { GalleryStaffRole } from '@perceptron/shared'

/**
 * Ensures gallery-scoped admin staff can only access data for their assigned gallery.
 * Super admins bypass this check entirely.
 *
 * @param getGalleryId - function that extracts the target galleryId from the request
 */
export function requireGalleryAccess(
  getGalleryId: (req: FastifyRequest) => string | undefined,
) {
  return async function galleryScopeMiddleware(
    req: FastifyRequest,
    reply: FastifyReply,
  ) {
    const admin = req.adminUser
    if (!admin) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Not authenticated' })
    }

    // Super admins can access all galleries
    if (admin.role === GalleryStaffRole.SUPER_ADMIN) return

    const targetGalleryId = getGalleryId(req)

    if (!targetGalleryId) return // Route doesn't specify a gallery — let the service filter by assigned gallery

    if (admin.galleryId !== targetGalleryId) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Access denied to this gallery',
      })
    }
  }
}

/**
 * Restricts query/body galleryId to the admin's assigned gallery.
 * Used when listing resources across galleries.
 */
export function assertAdminGalleryFilter(req: FastifyRequest, galleryId: string | undefined): string | undefined {
  const admin = req.adminUser
  if (!admin) return galleryId

  if (admin.role === GalleryStaffRole.SUPER_ADMIN) return galleryId

  // Non-super admins can only see their own gallery
  return admin.galleryId ?? undefined
}
