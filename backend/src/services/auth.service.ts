import { OAuth2Client } from 'google-auth-library'
import appleSignin from 'apple-signin-auth'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma'
import { redis, TTL, otpKey } from '../lib/redis'
import { config } from '../config'
import { AuthProvider } from '@perceptron/shared'
import type { User, GalleryStaff } from '@prisma/client'

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID)

// ─── Customer Auth ────────────────────────────────────────────────────────────

export async function authenticateWithApple(
  identityToken: string,
  displayName?: string,
  galleryId?: string,
): Promise<User> {
  const payload = await appleSignin.verifyIdToken(identityToken, {
    audience: config.APPLE_APP_ID,
    ignoreExpiration: false,
  })

  const providerUserId = payload.sub
  const email = payload.email ?? null

  return upsertOAuthUser(AuthProvider.APPLE, providerUserId, email, displayName, galleryId)
}

export async function authenticateWithGoogle(
  idToken: string,
  displayName?: string,
  galleryId?: string,
): Promise<User> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    ...(config.GOOGLE_CLIENT_ID && { audience: config.GOOGLE_CLIENT_ID }),
  })

  const payload = (ticket as unknown as { getPayload(): { sub?: string; email?: string; name?: string } | null }).getPayload()
  if (!payload?.sub) throw new Error('Invalid Google token')

  const email = payload.email ?? null
  const name = displayName ?? payload.name ?? null

  return upsertOAuthUser(AuthProvider.GOOGLE, payload.sub, email, name, galleryId)
}

async function upsertOAuthUser(
  provider: AuthProvider,
  providerUserId: string,
  email: string | null,
  displayName: string | null | undefined,
  galleryId?: string,
): Promise<User> {
  const existing = await prisma.user.findFirst({
    where: { authProvider: provider, providerUserId },
  })

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { lastActiveAt: new Date() },
    })
  }

  return prisma.user.create({
    data: {
      authProvider: provider,
      providerUserId,
      email,
      displayName: displayName ?? null,
      firstGalleryId: galleryId ?? null,
    },
  })
}

export async function createGuestUser(galleryId?: string): Promise<User> {
  return prisma.user.create({
    data: {
      authProvider: AuthProvider.GUEST,
      displayName: 'Guest',
      firstGalleryId: galleryId ?? null,
    },
  })
}

export async function requestPhoneOtp(phoneNumber: string): Promise<void> {
  const code = Math.floor(100000 + Math.random() * 900000).toString()

  await redis.set(otpKey(phoneNumber), code, 'EX', TTL.OTP)

  if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_PHONE_NUMBER) {
    // Twilio integration — optional dependency, only used if credentials are configured
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require('twilio') as (sid: string, token: string) => { messages: { create(opts: Record<string, string>): Promise<unknown> } }
    const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
    await client.messages.create({
      body: `Your Perceptron Gallery code is: ${code}`,
      from: config.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    })
  } else {
    // Stub: log code to console in non-production environments
    console.warn(`[auth] OTP for ${phoneNumber}: ${code}`)
  }
}

export async function verifyPhoneOtp(
  phoneNumber: string,
  code: string,
  galleryId?: string,
): Promise<User | null> {
  const stored = await redis.get(otpKey(phoneNumber))
  if (!stored || stored !== code) return null

  await redis.del(otpKey(phoneNumber))

  const existing = await prisma.user.findUnique({ where: { phoneNumber } })
  if (existing) {
    return prisma.user.update({ where: { id: existing.id }, data: { lastActiveAt: new Date() } })
  }

  return prisma.user.create({
    data: {
      authProvider: AuthProvider.PHONE,
      phoneNumber,
      firstGalleryId: galleryId ?? null,
    },
  })
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<GalleryStaff | null> {
  const staff = await prisma.galleryStaff.findUnique({ where: { email } })
  if (!staff) return null

  const valid = await bcrypt.compare(password, staff.passwordHash)
  if (!valid) return null

  await prisma.galleryStaff.update({
    where: { id: staff.id },
    data: { lastLoginAt: new Date() },
  })

  return staff
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export function generateStaffId(): string {
  return uuidv4()
}
