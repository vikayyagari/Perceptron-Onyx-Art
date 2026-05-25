import { buildApp } from './app'
import { config } from './config'
import { prisma } from './lib/prisma'
import { redis } from './lib/redis'

async function main() {
  const app = await buildApp()

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal} — shutting down gracefully`)
    await app.close()
    await prisma.$disconnect()
    redis.disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  try {
    await app.listen({ port: config.PORT, host: config.HOST })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
