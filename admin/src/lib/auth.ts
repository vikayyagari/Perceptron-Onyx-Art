import { cookies } from 'next/headers'
import { jwtVerify, importSPKI } from 'jose'
import type { GalleryStaffRole } from '@perceptron/shared'

export interface AdminSession {
  id: string
  role: GalleryStaffRole
  galleryId: string | null
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('perceptron_admin_token')?.value

  if (!token) return null

  try {
    const pem = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') ?? ''
    const publicKey = await importSPKI(pem, 'RS256')
    const { payload } = await jwtVerify(token, publicKey)

    if (payload['type'] !== 'admin') return null

    return {
      id: String(payload['sub'] ?? ''),
      role: String(payload['role'] ?? '') as GalleryStaffRole,
      galleryId: payload['galleryId'] ? String(payload['galleryId']) : null,
    }
  } catch {
    return null
  }
}

export function isSuperAdmin(session: AdminSession): boolean {
  return session.role === 'SUPER_ADMIN'
}

export function canManageGallery(session: AdminSession, galleryId: string): boolean {
  if (session.role === 'SUPER_ADMIN') return true
  return session.galleryId === galleryId
}

export const COOKIE_NAME = 'perceptron_admin_token'
export const REFRESH_COOKIE_NAME = 'perceptron_admin_refresh'
