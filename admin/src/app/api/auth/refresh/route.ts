import { type NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('perceptron_admin_refresh')?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
  }

  const res = await fetch(`${BACKEND}/v1/admin/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    const response = NextResponse.json({ error: 'Refresh failed' }, { status: 401 })
    response.cookies.delete('perceptron_admin_token')
    response.cookies.delete('perceptron_admin_refresh')
    return response
  }

  const data = await res.json()
  const isProd = process.env.NODE_ENV === 'production'
  const response = NextResponse.json({ ok: true })

  response.cookies.set('perceptron_admin_token', data.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  })

  response.cookies.set('perceptron_admin_refresh', data.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 60 * 60 * 24 * 30,
  })

  return response
}
