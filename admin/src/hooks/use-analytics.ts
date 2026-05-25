'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { buildQueryString } from '@/lib/utils'
import type { AnalyticsOverview } from '@perceptron/shared'

export function useAnalytics(galleryId?: string) {
  return useQuery({
    queryKey: ['analytics', galleryId],
    queryFn: () =>
      api.get<AnalyticsOverview>(
        `/v1/admin/analytics/overview${buildQueryString({ galleryId })}`,
      ),
  })
}
