import '@fastify/jwt'
import type { CustomerTokenPayload, AdminTokenPayload, RefreshTokenPayload } from '../lib/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: CustomerTokenPayload | AdminTokenPayload | RefreshTokenPayload
    user: CustomerTokenPayload | AdminTokenPayload | RefreshTokenPayload
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: {
      id: string
      email: string | null
      displayName: string | null
    }
    adminUser?: {
      id: string
      email: string
      role: import('@perceptron/shared').GalleryStaffRole
      galleryId: string | null
    }
  }
}
