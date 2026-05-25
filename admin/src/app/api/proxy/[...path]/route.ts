import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000'

async function proxy(req: NextRequest, params: { path: string[] }) {
  const cookieStore = cookies()
  const token = cookieStore.get('perceptron_admin_token')?.value

  const backendPath = '/' + params.path.join('/')
  const searchParams = req.nextUrl.searchParams.toString()
  const url = `${BACKEND}${backendPath}${searchParams ? `?${searchParams}` : ''}`

  const isFormData = req.headers.get('content-type')?.includes('multipart/form-data')

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isFormData) headers['Content-Type'] = 'application/json'

  const init: RequestInit = {
    method: req.method,
    headers,
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (isFormData) {
      init.body = await req.formData()
    } else {
      const text = await req.text()
      if (text) init.body = text
    }
  }

  try {
    const res = await fetch(url, init)
    const responseHeaders = new Headers()
    const contentType = res.headers.get('content-type')
    if (contentType) responseHeaders.set('content-type', contentType)

    if (res.status === 204) {
      return new NextResponse(null, { status: 204, headers: responseHeaders })
    }

    const body = await res.arrayBuffer()
    return new NextResponse(body, { status: res.status, headers: responseHeaders })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}

export const GET = (req: NextRequest, { params }: { params: { path: string[] } }) =>
  proxy(req, params)
export const POST = (req: NextRequest, { params }: { params: { path: string[] } }) =>
  proxy(req, params)
export const PUT = (req: NextRequest, { params }: { params: { path: string[] } }) =>
  proxy(req, params)
export const PATCH = (req: NextRequest, { params }: { params: { path: string[] } }) =>
  proxy(req, params)
export const DELETE = (req: NextRequest, { params }: { params: { path: string[] } }) =>
  proxy(req, params)
