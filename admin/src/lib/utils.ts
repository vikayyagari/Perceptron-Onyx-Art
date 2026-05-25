import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: string | null, currency = 'USD'): string {
  if (!amount) return 'N/A'
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export function formatDimensions(
  widthCm: number,
  heightCm: number,
  depthCm?: number | null,
): string {
  const parts = [`${widthCm}W × ${heightCm}H`]
  if (depthCm) parts.push(`× ${depthCm}D`)
  return parts.join(' ') + ' cm'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function buildQueryString(
  params: Record<string, unknown>,
): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v as string | number | boolean))}`)
    .join('&')
  return qs ? `?${qs}` : ''
}
