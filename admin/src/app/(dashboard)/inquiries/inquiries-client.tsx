'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Mail, Phone } from 'lucide-react'
import { useInquiries, useUpdateInquiryStatus } from '@/hooks/use-inquiries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatDateTime } from '@/lib/utils'
import { InquiryStatus } from '@perceptron/shared'
import type { InquiryPublic } from '@perceptron/shared'

const STATUS_COLORS: Record<InquiryStatus, 'default' | 'warning' | 'secondary'> = {
  NEW: 'default',
  CONTACTED: 'warning',
  CLOSED: 'secondary',
}

interface Props {
  galleryId?: string
}

export function InquiriesClient({ galleryId }: Props) {
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | 'all'>('all')
  const [selected, setSelected] = useState<InquiryPublic | null>(null)

  const { data, isLoading } = useInquiries({
    galleryId,
    status: filterStatus === 'all' ? undefined : filterStatus,
    limit: 50,
  })

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as InquiryStatus | 'all')}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.values(InquiryStatus).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} inquiries</span>
      </div>

      <div className="rounded-lg border divide-y overflow-hidden">
        {data?.data.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground">No inquiries found</div>
        ) : (
          data?.data.map((inq) => (
            <button
              key={inq.id}
              className="w-full flex items-start gap-4 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setSelected(inq)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{inq.contactEmail}</span>
                  {inq.status === 'NEW' && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{inq.message}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={STATUS_COLORS[inq.status]}>{inq.status}</Badge>
                <span className="text-[10px] text-muted-foreground">
                  {formatDateTime(inq.createdAt)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {selected && (
        <InquiryDetail inquiry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function InquiryDetail({ inquiry, onClose }: { inquiry: InquiryPublic; onClose: () => void }) {
  const updateMutation = useUpdateInquiryStatus(inquiry.id)

  async function setStatus(status: InquiryStatus) {
    await updateMutation.mutateAsync({ status })
    toast.success(`Status updated to ${status}`)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Inquiry Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{inquiry.contactEmail}</span>
              </div>
              {inquiry.contactPhone && (
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{inquiry.contactPhone}</span>
                </div>
              )}
            </div>
            <Badge variant={STATUS_COLORS[inquiry.status]}>{inquiry.status}</Badge>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Message</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>
          </div>

          <p className="text-xs text-muted-foreground">{formatDateTime(inquiry.createdAt)}</p>

          <Separator />

          <div className="flex gap-2">
            {inquiry.status !== 'CONTACTED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus(InquiryStatus.CONTACTED)}
                disabled={updateMutation.isPending}
              >
                Mark Contacted
              </Button>
            )}
            {inquiry.status !== 'CLOSED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus(InquiryStatus.CLOSED)}
                disabled={updateMutation.isPending}
              >
                Close
              </Button>
            )}
            {inquiry.status !== 'NEW' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStatus(InquiryStatus.NEW)}
                disabled={updateMutation.isPending}
              >
                Reopen
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
