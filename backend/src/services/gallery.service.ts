import { prisma } from '../lib/prisma'
import { getPublicUrl } from '../lib/s3'
import type { GalleryPublic } from '@perceptron/shared'
import type { Gallery } from '@prisma/client'

export function formatGallery(g: Gallery): GalleryPublic {
  return {
    id: g.id,
    name: g.name,
    address: g.address,
    city: g.city,
    country: g.country,
    timezone: g.timezone,
    contactEmail: g.contactEmail,
    contactPhone: g.contactPhone,
    brandPrimaryColor: g.brandPrimaryColor,
    brandLogoUrl: g.brandLogo ? getPublicUrl(g.brandLogo) : null,
    createdAt: g.createdAt.toISOString(),
  }
}

export async function listGalleries(): Promise<GalleryPublic[]> {
  const galleries = await prisma.gallery.findMany({ orderBy: { name: 'asc' } })
  return galleries.map(formatGallery)
}

export async function getGallery(id: string): Promise<GalleryPublic | null> {
  const gallery = await prisma.gallery.findUnique({ where: { id } })
  if (!gallery) return null
  return formatGallery(gallery)
}
