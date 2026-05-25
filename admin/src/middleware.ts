import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login']
const SUPER_ADMIN_PATHS = ['/galleries']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('perceptron_admin_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const publicKeyPem = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') ?? ''

    const { payload } = await jwtVerify(token, await importPublicKey(publicKeyPem), {
      algorithms: ['RS256'],
    })

    if (payload['type'] !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const role = payload['role'] as string
    if (
      SUPER_ADMIN_PATHS.some((p) => pathname.startsWith(p)) &&
      role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-admin-id', String(payload['sub'] ?? ''))
    requestHeaders.set('x-admin-role', role)
    requestHeaders.set('x-admin-gallery-id', String(payload['galleryId'] ?? ''))

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('perceptron_admin_token')
    return response
  }
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const pemHeader = '-----BEGIN PUBLIC KEY-----'
  const pemFooter = '-----END PUBLIC KEY-----'
  const pemContents = pem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
