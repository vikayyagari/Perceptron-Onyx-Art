import { prisma } from '../lib/prisma'
import { getPublicUrl } from '../lib/s3'
import { PaintingStatus } from '@perceptron/shared'
import type { PaintingPublic, PaintingListItem, ArtistPublic, PaintingsQuery, PaginatedResponse } from '@perceptron/shared'
import type { Painting, Artist } from '@prisma/client'

type PaintingWithArtist = Painting & { artist: Artist }

function formatArtist(a: Artist): ArtistPublic {
  return {
    id: a.id,
    name: a.name,
    slug: a.slug,
    bio: a.bio,
    birthYear: a.birthYear,
    deathYear: a.deathYear,
    nationality: a.nationality,
    portraitImageUrl: a.portraitImage ? getPublicUrl(a.portraitImage) : null,
  }
}

export function formatPaintingPublic(p: PaintingWithArtist): PaintingPublic {
  return {
    id: p.id,
    galleryId: p.galleryId,
    title: p.title,
    year: p.year,
    medium: p.medium,
    widthCm: Number(p.widthCm),
    heightCm: Number(p.heightCm),
    depthCm: p.depthCm !== null ? Number(p.depthCm) : null,
    price: p.price !== null ? p.price.toString() : null,
    currency: p.currency,
    description: p.description,
    provenance: p.provenance,
    primaryImageUrl: getPublicUrl(p.primaryImage),
    dominantColor: p.dominantColor,
    status: p.status as PaintingStatus,
    artist: formatArtist(p.artist),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

export function formatPaintingListItem(p: PaintingWithArtist): PaintingListItem {
  return {
    id: p.id,
    galleryId: p.galleryId,
    title: p.title,
    year: p.year,
    medium: p.medium,
    widthCm: Number(p.widthCm),
    heightCm: Number(p.heightCm),
    price: p.price !== null ? p.price.toString() : null,
    currency: p.currency,
    primaryImageUrl: getPublicUrl(p.primaryImage),
    dominantColor: p.dominantColor,
    status: p.status as PaintingStatus,
    artist: { id: p.artist.id, name: p.artist.name, slug: p.artist.slug },
  }
}

export async function listPaintings(
  query: PaintingsQuery,
): Promise<PaginatedResponse<PaintingListItem>> {
  const page = Math.max(1, query.page ?? 1)
  const limit = Math.min(100, Math.max(1, query.limit ?? 20))
  const skip = (page - 1) * limit

  const where = {
    ...(query.galleryId && { galleryId: query.galleryId }),
    ...(query.artistId && { artistId: query.artistId }),
    ...(query.status && { status: query.status }),
    ...(query.search && {
      OR: [
        { title: { contains: query.search, mode: 'insensitive' as const } },
        { artist: { name: { contains: query.search, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const [paintings, total] = await Promise.all([
    prisma.painting.findMany({
      where,
      include: { artist: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.painting.count({ where }),
  ])

  return {
    data: paintings.map(formatPaintingListItem),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getPainting(id: string): Promise<PaintingPublic | null> {
  const painting = await prisma.painting.findUnique({
    where: { id },
    include: { artist: true },
  })
  if (!painting) return null
  return formatPaintingPublic(painting)
}

export async function getPaintingByQrCode(qrCodeId: string): Promise<PaintingPublic | null> {
  const painting = await prisma.painting.findUnique({
    where: { qrCodeId },
    include: { artist: true },
  })
  if (!painting) return null
  return formatPaintingPublic(painting)
}

export async function getSavedPaintings(userId: string): Promise<PaintingListItem[]> {
  const saved = await prisma.savedPainting.findMany({
    where: { userId },
    include: { painting: { include: { artist: true } } },
    orderBy: { savedAt: 'desc' },
  })
  return saved.map((s) => formatPaintingListItem(s.painting))
}

export async function savePainting(userId: string, paintingId: string): Promise<void> {
  await prisma.savedPainting.upsert({
    where: { userId_paintingId: { userId, paintingId } },
    create: { userId, paintingId },
    update: {},
  })
}

export async function unsavePainting(userId: string, paintingId: string): Promise<void> {
  await prisma.savedPainting
    .delete({ where: { userId_paintingId: { userId, paintingId } } })
    .catch(() => undefined) // ignore if not saved
}
