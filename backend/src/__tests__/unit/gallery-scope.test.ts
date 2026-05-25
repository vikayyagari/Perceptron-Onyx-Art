import { assertAdminGalleryFilter } from '../../middleware/gallery-scope'
import type { FastifyRequest } from 'fastify'
import { GalleryStaffRole } from '@perceptron/shared'

function makeRequest(role: GalleryStaffRole, galleryId: string | null): FastifyRequest {
  return { adminUser: { id: 'staff-id', email: 'test@test.com', role, galleryId } } as unknown as FastifyRequest
}

describe('assertAdminGalleryFilter', () => {
  it('returns the requested galleryId for super admins', () => {
    const req = makeRequest(GalleryStaffRole.SUPER_ADMIN, null)
    expect(assertAdminGalleryFilter(req, 'gallery-abc')).toBe('gallery-abc')
  })

  it('returns undefined galleryId for super admin when not specified', () => {
    const req = makeRequest(GalleryStaffRole.SUPER_ADMIN, null)
    expect(assertAdminGalleryFilter(req, undefined)).toBeUndefined()
  })

  it('forces gallery admin to their own gallery', () => {
    const req = makeRequest(GalleryStaffRole.GALLERY_ADMIN, 'gallery-assigned')
    // Regardless of what they request, they get their assigned gallery
    expect(assertAdminGalleryFilter(req, 'gallery-other')).toBe('gallery-assigned')
  })

  it('forces gallery staff to their own gallery', () => {
    const req = makeRequest(GalleryStaffRole.GALLERY_STAFF, 'gallery-assigned')
    expect(assertAdminGalleryFilter(req, undefined)).toBe('gallery-assigned')
  })

  it('returns undefined for gallery admin without assigned gallery', () => {
    // Edge case: should not happen in production, but handled gracefully
    const req = makeRequest(GalleryStaffRole.GALLERY_ADMIN, null)
    expect(assertAdminGalleryFilter(req, undefined)).toBeUndefined()
  })
})
