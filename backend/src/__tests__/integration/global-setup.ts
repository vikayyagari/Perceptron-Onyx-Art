import { execSync } from 'child_process'
import { join } from 'path'

export default async function globalSetup() {
  // Unit tests don't need a database — skip migration if DB is unreachable
  if (process.env['SKIP_DB_SETUP'] === 'true') return

  const dbUrl =
    process.env['DATABASE_URL_TEST'] ??
    'postgresql://perceptron:perceptron@localhost:5432/gallery_test?schema=public'

  try {
    execSync('npx prisma migrate deploy', {
      cwd: join(__dirname, '..', '..', '..'),
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    })
  } catch (e) {
    // Non-fatal for unit test runs — integration tests will fail naturally
    console.warn('\n⚠️  Could not apply DB migrations (Docker Compose running?). Integration tests will be skipped.\n')
  }
}
