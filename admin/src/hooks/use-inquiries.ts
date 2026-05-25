'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { buildQueryString } from '@/lib/utils'
import type {
  InquiryPublic,
  PaginatedResponse,
  UpdateInquiryStatusRequest,
  PaginationQuery,
} from '@perceptron/shared'
import type { InquiryStatus } from '@perceptron/shared'

interface InquiriesQuery extends PaginationQuery {
  galleryId?: string
  status?: InquiryStatus
}

const KEYS = {
  list: (q: InquiriesQuery) => ['inquiries', q] as const,
  detail: (id: string) => ['inquiries', id] as const,
}

export function useInquiries(query: InquiriesQuery = {}) {
  return useQuery({
    queryKey: KEYS.list(query),
    queryFn: () =>
      api.get<PaginatedResponse<InquiryPublic>>(
        `/v1/admin/inquiries${buildQueryString(query as Record<string, unknown>)}`,
      ),
  })
}

export function useUpdateInquiryStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateInquiryStatusRequest) =>
      api.patch<InquiryPublic>(`/v1/admin/inquiries/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inquiries'] })
    },
  })
}
