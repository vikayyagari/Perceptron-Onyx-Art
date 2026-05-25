'use client'

import Link from 'next/link'
import { useAnalytics } from '@/hooks/use-analytics'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface Props {
  galleryId?: string
}

export function DashboardClient({ galleryId }: Props) {
  const { data, isLoading, error } = useAnalytics(galleryId)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <StatsCards data={data} />
      <AnalyticsCharts data={data} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Inquiries</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/inquiries">
              View all <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.recentInquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inquiries yet</p>
          ) : (
            <div className="space-y-3">
              {data.recentInquiries.slice(0, 5).map((inq) => (
                <div
                  key={inq.id}
                  className="flex items-start justify-between gap-4 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inq.contactEmail}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{inq.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      variant={
                        inq.status === 'NEW'
                          ? 'default'
                          : inq.status === 'CONTACTED'
                            ? 'warning'
                            : 'secondary'
                      }
                    >
                      {inq.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateTime(inq.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
