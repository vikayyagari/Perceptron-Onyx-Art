import Redis from 'ioredis'
import { config } from '../config'

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined
}

function createRedisClient() {
  const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  })

  client.on('error', (err) => {
    console.error('[redis] connection error', err)
  })

  return client
}

export const redis = globalThis.__redis ?? createRedisClient()

if (config.NODE_ENV !== 'production') {
  globalThis.__redis = redis
}

// TTLs in seconds
export const TTL = {
  ACCESS_TOKEN: 60 * 60,        // 1 hour
  REFRESH_TOKEN: 60 * 60 * 24 * 30,  // 30 days
  OTP: 60 * 10,                 // 10 minutes
  RATE_LIMIT_WINDOW: 60,        // 1 minute
} as const

export function refreshTokenKey(userId: string, jti: string) {
  return `rt:${userId}:${jti}`
}

export function otpKey(phoneNumber: string) {
  return `otp:${phoneNumber}`
}
