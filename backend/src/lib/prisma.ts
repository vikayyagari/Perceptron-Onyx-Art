import { PrismaClient } from '@prisma/client'
import { config } from '../config'

declare global {
  // Prevents multiple instances in development hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log:
      config.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, 'error', 'warn']
        : ['error'],
  })
}

export const prisma = globalThis.__prisma ?? createPrismaClient()

if (config.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}
