'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { buildQueryString } from '@/lib/utils'
import type {
  PaintingPublic,
  PaintingListItem,
  PaginatedResponse,
  CreatePaintingRequest,
  UpdatePaintingRequest,
  PaintingsQuery,
} from '@perceptron/shared'

const KEYS = {
  list: (q: PaintingsQuery) => ['paintings', q] as const,
  detail: (id: string) => ['paintings', id] as const,
}

export function usePaintings(query: PaintingsQuery = {}) {
  return useQuery({
    queryKey: KEYS.list(query),
    queryFn: () =>
      api.get<PaginatedResponse<PaintingListItem>>(
        `/v1/admin/paintings${buildQueryString(query as Record<string, unknown>)}`,
      ),
  })
}

export function usePainting(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get<PaintingPublic>(`/v1/admin/paintings/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreatePainting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePaintingRequest) =>
      api.post<PaintingPublic>('/v1/admin/paintings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paintings'] }),
  })
}

export function useUpdatePainting(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePaintingRequest) =>
      api.patch<PaintingPublic>(`/v1/admin/paintings/${id}`, data),
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(id), updated)
      qc.invalidateQueries({ queryKey: ['paintings'] })
    },
  })
}

export function useDeletePainting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/admin/paintings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paintings'] }),
  })
}

export function useUploadPaintingImage(paintingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('image', file)
      return api.upload<PaintingPublic>(`/v1/admin/paintings/${paintingId}/images`, fd)
    },
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(paintingId), updated)
      qc.invalidateQueries({ queryKey: ['paintings'] })
    },
  })
}
