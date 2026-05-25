'use client'

import { Palette, Eye, Heart, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalyticsOverview } from '@perceptron/shared'

interface StatsCardsProps {
  data: AnalyticsOverview
}

export function StatsCards({ data }: StatsCardsProps) {
  const stats = [
    {
      title: 'Total Scans',
      value: data.totalScans.toLocaleString(),
      icon: Eye,
      description: `QR: ${data.scansByMethod.QR} · CV: ${data.scansByMethod.COMPUTER_VISION}`,
    },
    {
      title: 'Visualizations',
      value: data.totalVisualizations.toLocaleString(),
      icon: Palette,
      description: `AR: ${data.visualizationsByMode.AR} · Photo: ${data.visualizationsByMode.PHOTO_UPLOAD}`,
    },
    {
      title: 'Saved Paintings',
      value: data.totalSavedPaintings.toLocaleString(),
      icon: Heart,
      description: 'By app users',
    },
    {
      title: 'Inquiries',
      value: data.totalInquiries.toLocaleString(),
      icon: MessageSquare,
      description: `${data.recentInquiries.filter((i) => i.status === 'NEW').length} new`,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ title, value, icon: Icon, description }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
