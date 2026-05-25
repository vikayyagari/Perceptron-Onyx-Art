'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { buildQueryString } from '@/lib/utils'
import type {
  GalleryStaffPublic,
  PaginatedResponse,
  CreateStaffRequest,
  UpdateStaffRequest,
  PaginationQuery,
} from '@perceptron/shared'

const KEYS = {
  list: (q: PaginationQuery) => ['staff', q] as const,
  detail: (id: string) => ['staff', id] as const,
}

export function useStaff(query: PaginationQuery = {}) {
  return useQuery({
    queryKey: KEYS.list(query),
    queryFn: () =>
      api.get<PaginatedResponse<GalleryStaffPublic>>(
        `/v1/admin/staff${buildQueryString(query as Record<string, unknown>)}`,
      ),
  })
}

export function useCreateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateStaffRequest) =>
      api.post<GalleryStaffPublic>('/v1/admin/staff', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })
}

export function useUpdateStaff(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateStaffRequest) =>
      api.patch<GalleryStaffPublic>(`/v1/admin/staff/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })
}

export function useDeleteStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/admin/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })
}
