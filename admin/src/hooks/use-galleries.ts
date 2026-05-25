'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type {
  GalleryPublic,
  PaginatedResponse,
  CreateGalleryRequest,
  UpdateGalleryRequest,
} from '@perceptron/shared'

const KEYS = {
  list: () => ['galleries'] as const,
  detail: (id: string) => ['galleries', id] as const,
}

export function useGalleries() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: () => api.get<PaginatedResponse<GalleryPublic>>('/v1/admin/galleries'),
  })
}

export function useGallery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get<GalleryPublic>(`/v1/admin/galleries/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateGallery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGalleryRequest) =>
      api.post<GalleryPublic>('/v1/admin/galleries', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['galleries'] }),
  })
}

export function useUpdateGallery(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateGalleryRequest) =>
      api.patch<GalleryPublic>(`/v1/admin/galleries/${id}`, data),
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(id), updated)
      qc.invalidateQueries({ queryKey: ['galleries'] })
    },
  })
}

export function useUploadGalleryLogo(galleryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('logo', file)
      return api.upload<GalleryPublic>(`/v1/admin/galleries/${galleryId}/logo`, fd)
    },
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(galleryId), updated)
      qc.invalidateQueries({ queryKey: ['galleries'] })
    },
  })
}
