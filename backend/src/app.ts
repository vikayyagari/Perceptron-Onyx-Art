import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import { config } from './config'
import jwtPlugin from './plugins/jwt'
import corsPlugin from './plugins/cors'
import rateLimitPlugin from './plugins/rate-limit'
import multipartPlugin from './plugins/multipart'
import { healthRoutes } from './routes/health'
import { v1Routes } from './routes/v1/index'
import type { FastifyError } from 'fastify'
import { ZodError } from 'zod'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
        },
      }),
    },
    genReqId: () => randomUUID(),
    ajv: {
      customOptions: {
        removeAdditional: false,
        useDefaults: true,
        coerceTypes: false,
        allErrors: true,
      },
    },
  })

  // Propagate request ID to response header for tracing
  app.addHook('onSend', async (req, reply) => {
    void reply.header('X-Request-ID', req.id)
  })

  // Global error handler
  app.setErrorHandler((error: FastifyError | ZodError | Error, req, reply) => {
    req.log.error({ err: error }, 'Unhandled error')

    if (error instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.issues[0]?.message ?? 'Validation error',
        details: error.issues,
      })
    }

    // Prisma unique constraint violation
    if ('code' in error && error.code === 'P2002') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'A record with this value already exists',
      })
    }

    // Prisma not found
    if ('code' in error && error.code === 'P2025') {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Record not found',
      })
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      })
    }

    // Fastify validation errors (from JSON Schema)
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name,
        message: error.message,
      })
    }

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: config.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
    })
  })

  // Register plugins (order matters — jwt must be before routes that use it)
  await app.register(jwtPlugin)
  await app.register(corsPlugin)
  await app.register(rateLimitPlugin)
  await app.register(multipartPlugin)

  // Register routes
  await app.register(healthRoutes)
  await app.register(v1Routes, { prefix: '/v1' })

  return app
}
