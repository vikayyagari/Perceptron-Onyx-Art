import { v4 as uuidv4 } from 'uuid'
import { uploadObject, deleteObject } from '../lib/s3'
import type { MultipartFile } from '@fastify/multipart'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadPaintingImage(
  file: MultipartFile,
  paintingId: string,
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw new Error(`Unsupported image type: ${file.mimetype}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`)
  }

  const ext = file.mimetype.split('/')[1] ?? 'jpg'
  const key = `paintings/${paintingId}/${uuidv4()}.${ext}`
  const buffer = await file.toBuffer()

  await uploadObject(key, buffer, file.mimetype)
  return key
}

export async function uploadArtistPortrait(
  file: MultipartFile,
  artistId: string,
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw new Error(`Unsupported image type: ${file.mimetype}`)
  }

  const ext = file.mimetype.split('/')[1] ?? 'jpg'
  const key = `artists/${artistId}/portrait.${ext}`
  const buffer = await file.toBuffer()

  await uploadObject(key, buffer, file.mimetype)
  return key
}

export async function uploadGalleryLogo(
  file: MultipartFile,
  galleryId: string,
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw new Error(`Unsupported image type: ${file.mimetype}`)
  }

  const ext = file.mimetype.split('/')[1] ?? 'png'
  const key = `galleries/${galleryId}/logo.${ext}`
  const buffer = await file.toBuffer()

  await uploadObject(key, buffer, file.mimetype)
  return key
}

export { deleteObject as deleteStorageObject }
