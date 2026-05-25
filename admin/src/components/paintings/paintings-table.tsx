'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Plus, Trash2, QrCode, Search } from 'lucide-react'
import { toast } from 'sonner'
import { usePaintings, useDeletePainting } from '@/hooks/use-paintings'
import { StatusBadge } from './status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatCurrency, formatDimensions } from '@/lib/utils'
import { PaintingStatus } from '@perceptron/shared'
import type { PaintingsQuery } from '@perceptron/shared'

interface Props {
  galleryId?: string
}

export function PaintingsTable({ galleryId }: Props) {
  const [query, setQuery] = useState<PaintingsQuery>({ galleryId, page: 1, limit: 20 })
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = usePaintings({ ...query, search: search || undefined })
  const deleteMutation = useDeletePainting()

  async function handleDelete() {
    if (!deleteId) return
    await deleteMutation.mutateAsync(deleteId)
    toast.success('Painting deleted')
    setDeleteId(null)
  }

  async function downloadQr(paintingId: string) {
    const res = await fetch(`/api/proxy/v1/admin/paintings/${paintingId}/qr`)
    if (!res.ok) { toast.error('Failed to generate QR'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `placard-${paintingId}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search paintings…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={query.status ?? 'all'}
          onValueChange={(v) =>
            setQuery((q) => ({ ...q, status: v === 'all' ? undefined : (v as PaintingStatus) }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.values(PaintingStatus).map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild>
          <Link href="/paintings/new">
            <Plus className="mr-2 h-4 w-4" /> Add Painting
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Painting</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Artist</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dimensions</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.data.map((painting) => (
                <tr key={painting.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/paintings/${painting.id}`} className="flex items-center gap-3 hover:underline">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                        {painting.primaryImageUrl ? (
                          <Image
                            src={painting.primaryImageUrl}
                            alt={painting.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div
                            className="h-full w-full"
                            style={{ background: painting.dominantColor ?? '#e5e7eb' }}
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{painting.title}</p>
                        {painting.year && (
                          <p className="text-xs text-muted-foreground">{painting.year}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{painting.artist.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDimensions(painting.widthCm, painting.heightCm)}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(painting.price, painting.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={painting.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadQr(painting.id)}
                        title="Download QR placard"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(painting.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No paintings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.total} paintings</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={query.page === 1}
              onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
            >
              Previous
            </Button>
            <span className="px-2 py-1">
              {query.page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={query.page === data.totalPages}
              onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete painting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the painting and all associated images. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
