import { hashPassword } from '../../services/auth.service'
import { createGuestUser } from '../../services/auth.service'

// Mock Prisma
jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    galleryStaff: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

// Mock Redis
jest.mock('../../lib/redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn(),
  },
  TTL: { ACCESS_TOKEN: 3600, REFRESH_TOKEN: 2592000, OTP: 600, RATE_LIMIT_WINDOW: 60 },
  otpKey: (phone: string) => `otp:${phone}`,
  refreshTokenKey: (userId: string, jti: string) => `rt:${userId}:${jti}`,
}))

import { prisma } from '../../lib/prisma'
import { redis } from '../../lib/redis'
import { requestPhoneOtp, verifyPhoneOtp } from '../../services/auth.service'

describe('hashPassword', () => {
  it('produces a bcrypt hash', async () => {
    const hash = await hashPassword('TestPassword123!')
    expect(hash).toMatch(/^\$2[aby]\$/)
  })

  it('produces different hashes for the same input', async () => {
    const [h1, h2] = await Promise.all([
      hashPassword('SamePassword1!'),
      hashPassword('SamePassword1!'),
    ])
    expect(h1).not.toBe(h2)
  })
})

describe('createGuestUser', () => {
  it('creates a guest user with GUEST auth provider', async () => {
    const mockUser = { id: 'test-id', authProvider: 'GUEST', email: null, displayName: 'Guest' }
    ;(prisma.user.create as jest.Mock).mockResolvedValue(mockUser)

    const user = await createGuestUser('gallery-id-123')
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ authProvider: 'GUEST', firstGalleryId: 'gallery-id-123' }),
    })
    expect(user.authProvider).toBe('GUEST')
  })
})

describe('requestPhoneOtp', () => {
  it('stores OTP in Redis with TTL', async () => {
    await requestPhoneOtp('+15555550100')
    expect(redis.set).toHaveBeenCalledWith(
      'otp:+15555550100',
      expect.stringMatching(/^\d{6}$/),
      'EX',
      600,
    )
  })
})

describe('verifyPhoneOtp', () => {
  it('returns null for wrong code', async () => {
    ;(redis.get as jest.Mock).mockResolvedValue('123456')
    const result = await verifyPhoneOtp('+15555550101', '999999')
    expect(result).toBeNull()
  })

  it('creates a new user on correct code if no existing user', async () => {
    ;(redis.get as jest.Mock).mockResolvedValue('654321')
    ;(redis.del as jest.Mock).mockResolvedValue(1)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    const mockUser = { id: 'new-id', authProvider: 'PHONE', phoneNumber: '+15555550102' }
    ;(prisma.user.create as jest.Mock).mockResolvedValue(mockUser)

    const result = await verifyPhoneOtp('+15555550102', '654321')
    expect(redis.del).toHaveBeenCalled()
    expect(result).toEqual(mockUser)
  })

  it('updates lastActiveAt for existing user on correct code', async () => {
    ;(redis.get as jest.Mock).mockResolvedValue('111111')
    ;(redis.del as jest.Mock).mockResolvedValue(1)
    const existing = { id: 'existing-id', authProvider: 'PHONE', phoneNumber: '+15555550103' }
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(existing)
    ;(prisma.user.update as jest.Mock).mockResolvedValue({ ...existing, lastActiveAt: new Date() })

    const result = await verifyPhoneOtp('+15555550103', '111111')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
      data: { lastActiveAt: expect.any(Date) },
    })
    expect(result).toBeTruthy()
  })
})
