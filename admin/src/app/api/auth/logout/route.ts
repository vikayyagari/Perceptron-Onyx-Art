import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('perceptron_admin_token')
  response.cookies.delete('perceptron_admin_refresh')
  return response
}
