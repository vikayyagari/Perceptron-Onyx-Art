import type { FastifyInstance } from 'fastify'
import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { redis, TTL, refreshTokenKey } from './redis'
import type { GalleryStaffRole } from '@perceptron/shared'

export interface CustomerTokenPayload {
  sub: string
  type: 'customer'
  iat?: number
  exp?: number
}

export interface AdminTokenPayload {
  sub: string
  type: 'admin'
  role: GalleryStaffRole
  galleryId: string | null
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  sub: string
  type: 'refresh'
  tokenType: 'customer' | 'admin'
  jti: string
  iat?: number
  exp?: number
}

export type TokenPayload = CustomerTokenPayload | AdminTokenPayload | RefreshTokenPayload

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function issueCustomerTokens(
  fastify: FastifyInstance,
  userId: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const jti = uuidv4()

  const accessToken = fastify.jwt.sign(
    { sub: userId, type: 'customer' } satisfies Omit<CustomerTokenPayload, 'iat' | 'exp'>,
    { expiresIn: TTL.ACCESS_TOKEN },
  )

  const refreshToken = fastify.jwt.sign(
    { sub: userId, type: 'refresh', tokenType: 'customer', jti } satisfies Omit<
      RefreshTokenPayload,
      'iat' | 'exp'
    >,
    { expiresIn: TTL.REFRESH_TOKEN },
  )

  await redis.set(refreshTokenKey(userId, jti), hashToken(refreshToken), 'EX', TTL.REFRESH_TOKEN)

  return { accessToken, refreshToken }
}

export async function issueAdminTokens(
  fastify: FastifyInstance,
  staffId: string,
  role: GalleryStaffRole,
  galleryId: string | null,
): Promise<{ accessToken: string; refreshToken: string }> {
  const jti = uuidv4()

  const accessToken = fastify.jwt.sign(
    { sub: staffId, type: 'admin', role, galleryId } satisfies Omit<
      AdminTokenPayload,
      'iat' | 'exp'
    >,
    { expiresIn: TTL.ACCESS_TOKEN },
  )

  const refreshToken = fastify.jwt.sign(
    { sub: staffId, type: 'refresh', tokenType: 'admin', jti } satisfies Omit<
      RefreshTokenPayload,
      'iat' | 'exp'
    >,
    { expiresIn: TTL.REFRESH_TOKEN },
  )

  await redis.set(refreshTokenKey(staffId, jti), hashToken(refreshToken), 'EX', TTL.REFRESH_TOKEN)

  return { accessToken, refreshToken }
}

/** Validates a refresh token and rotates it (old token is revoked, new one issued). */
export async function rotateRefreshToken(
  fastify: FastifyInstance,
  token: string,
): Promise<{ accessToken: string; refreshToken: string; payload: RefreshTokenPayload } | null> {
  let decoded: RefreshTokenPayload
  try {
    decoded = fastify.jwt.verify<RefreshTokenPayload>(token)
  } catch {
    return null
  }

  if (decoded.type !== 'refresh') return null

  const key = refreshTokenKey(decoded.sub, decoded.jti)
  const stored = await redis.get(key)
  if (!stored || stored !== hashToken(token)) return null

  // Revoke old token
  await redis.del(key)

  // Issue new token pair
  let tokens: { accessToken: string; refreshToken: string }
  if (decoded.tokenType === 'admin') {
    // Re-decode the admin payload to get role/galleryId — not stored in refresh token
    // We need to re-fetch from DB; handled by the caller
    return { accessToken: '', refreshToken: '', payload: decoded }
  }

  tokens = await issueCustomerTokens(fastify, decoded.sub)
  return { ...tokens, payload: decoded }
}

/** Revokes a specific refresh token. */
export async function revokeRefreshToken(userId: string, jti: string): Promise<void> {
  await redis.del(refreshTokenKey(userId, jti))
}

/** Revokes ALL refresh tokens for a user (logout from all devices). */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  const keys = await redis.keys(`rt:${userId}:*`)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
