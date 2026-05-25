/**
 * Generates an RS256 key pair for JWT signing.
 * Run with: pnpm keys:generate
 *
 * Output is suitable for pasting directly into .env.
 * Newlines are escaped as \n for single-line env var compatibility.
 */
import { generateKeyPairSync } from 'crypto'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

// Save raw PEM files (for production secrets managers)
const keysDir = join(__dirname, '..', 'keys')
mkdirSync(keysDir, { recursive: true })
writeFileSync(join(keysDir, 'private.pem'), privateKey)
writeFileSync(join(keysDir, 'public.pem'), publicKey)

// Also print .env-compatible single-line versions
const toEnvVar = (pem: string) => pem.replace(/\n/g, '\\n')

console.log('\n# Add these to your .env file:\n')
console.log(`JWT_PRIVATE_KEY="${toEnvVar(privateKey)}"`)
console.log(`JWT_PUBLIC_KEY="${toEnvVar(publicKey)}"`)
console.log('\n# PEM files also saved to backend/keys/ (git-ignored)')
console.log('# IMPORTANT: Never commit the keys/ directory or your .env file\n')
