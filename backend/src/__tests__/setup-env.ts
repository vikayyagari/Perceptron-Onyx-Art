/**
 * Sets up environment variables before any test module is loaded.
 * Jest runs this file via `setupFiles` (before module instantiation).
 */
import { generateKeyPairSync } from 'crypto'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

process.env['NODE_ENV'] = 'test'
process.env['PORT'] = '0'
process.env['DATABASE_URL'] =
  process.env['DATABASE_URL_TEST'] ??
  'postgresql://perceptron:perceptron@localhost:5432/gallery_test?schema=public'
process.env['REDIS_URL'] = process.env['REDIS_URL'] ?? 'redis://localhost:6379'
process.env['JWT_PRIVATE_KEY'] = privateKey.replace(/\n/g, '\\n')
process.env['JWT_PUBLIC_KEY'] = publicKey.replace(/\n/g, '\\n')
process.env['S3_BUCKET'] = 'test-bucket'
process.env['S3_ACCESS_KEY_ID'] = 'test'
process.env['S3_SECRET_ACCESS_KEY'] = 'test'
process.env['S3_ENDPOINT'] = 'http://localhost:9000'
process.env['S3_REGION'] = 'us-east-1'
process.env['LOG_LEVEL'] = 'silent'
