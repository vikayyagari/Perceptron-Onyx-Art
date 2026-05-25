'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { buildQueryString } from '@/lib/utils'
import type {
  ArtistPublic,
  PaginatedResponse,
  CreateArtistRequest,
  UpdateArtistRequest,
  PaginationQuery,
} from '@perceptron/shared'

const KEYS = {
  list: (q: PaginationQuery) => ['artists', q] as const,
  detail: (id: string) => ['artists', id] as const,
}

export function useArtists(query: PaginationQuery = {}) {
  return useQuery({
    queryKey: KEYS.list(query),
    queryFn: () =>
      api.get<PaginatedResponse<ArtistPublic>>(`/v1/admin/artists${buildQueryString(query as Record<string, unknown>)}`),
  })
}

export function useArtist(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get<ArtistPublic>(`/v1/admin/artists/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateArtist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateArtistRequest) => api.post<ArtistPublic>('/v1/admin/artists', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['artists'] }),
  })
}

export function useUpdateArtist(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateArtistRequest) =>
      api.patch<ArtistPublic>(`/v1/admin/artists/${id}`, data),
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(id), updated)
      qc.invalidateQueries({ queryKey: ['artists'] })
    },
  })
}

export function useDeleteArtist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/admin/artists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['artists'] }),
  })
}

export function useUploadArtistPortrait(artistId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('portrait', file)
      return api.upload<ArtistPublic>(`/v1/admin/artists/${artistId}/portrait`, fd)
    },
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(artistId), updated)
      qc.invalidateQueries({ queryKey: ['artists'] })
    },
  })
}
