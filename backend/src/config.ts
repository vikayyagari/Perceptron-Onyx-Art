import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().url(),
  DATABASE_URL_TEST: z.string().url().optional(),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  // RS256 key pair — newlines can be escaped as \n in env vars
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),

  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  // Public base URL used to construct image URLs returned in API responses
  S3_PUBLIC_URL: z.string().url().optional(),

  CORS_ORIGIN: z.string().default('http://localhost:3001'),

  APPLE_APP_ID: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),
})

function parseConfig() {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  return result.data
}

export const config = parseConfig()
export type Config = z.infer<typeof schema>

// Normalise PEM keys that arrive as single-line env vars with literal \n
export function getJwtPrivateKey() {
  return config.JWT_PRIVATE_KEY.replace(/\\n/g, '\n')
}

export function getJwtPublicKey() {
  return config.JWT_PUBLIC_KEY.replace(/\\n/g, '\n')
}
