import { type NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${BACKEND}/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json(err, { status: res.status })
  }

  const data = await res.json()
  const { accessToken, refreshToken } = data

  const response = NextResponse.json({ staff: data.staff })

  const isProd = process.env.NODE_ENV === 'production'

  response.cookies.set('perceptron_admin_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  })

  response.cookies.set('perceptron_admin_refresh', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 60 * 60 * 24 * 30,
  })

  return response
}
