'use client'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `/api/proxy${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    credentials: 'same-origin',
  })

  if (!res.ok) {
    let body: { message?: string; error?: string; details?: unknown } = {}
    try {
      body = await res.json()
    } catch (_) { /* ignore */ }
    throw new ApiError(
      res.status,
      body.message ?? body.error ?? `HTTP ${res.status}`,
      body.details,
    )
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get<T>(path: string) {
    return request<T>(path, { method: 'GET' })
  },

  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },

  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },

  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },

  delete<T = void>(path: string) {
    return request<T>(path, { method: 'DELETE' })
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const url = `/api/proxy${path}`
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    })
    if (!res.ok) {
      let body: { message?: string } = {}
      try {
        body = await res.json()
      } catch {}
      throw new ApiError(res.status, body.message ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
  },
}

export { BACKEND_URL }
