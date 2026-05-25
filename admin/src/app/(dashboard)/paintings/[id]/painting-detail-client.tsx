'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, QrCode, Trash2, ArrowLeft, Save } from 'lucide-react'
import { usePainting, useUpdatePainting, useDeletePainting, useUploadPaintingImage } from '@/hooks/use-paintings'
import { useArtists } from '@/hooks/use-artists'
import { StatusBadge } from '@/components/paintings/status-badge'
import { TiptapEditor } from '@/components/tiptap-editor'
import { ImageUpload } from '@/components/image-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PaintingStatus } from '@perceptron/shared'
import { formatCurrency, formatDate, formatDimensions } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1),
  year: z.coerce.number().int().min(1000).max(2100).optional().nullable(),
  medium: z.string().optional().nullable(),
  widthCm: z.coerce.number().positive(),
  heightCm: z.coerce.number().positive(),
  depthCm: z.coerce.number().positive().optional().nullable(),
  price: z.string().optional().nullable(),
  currency: z.string(),
  status: z.nativeEnum(PaintingStatus),
  artistId: z.string(),
  description: z.string(),
  provenance: z.string().optional().nullable(),
  dominantColor: z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

export function PaintingDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { data: painting, isLoading } = usePainting(id)
  const { data: artists } = useArtists({ limit: 100 })
  const updateMutation = useUpdatePainting(id)
  const deleteMutation = useDeletePainting()
  const uploadMutation = useUploadPaintingImage(id)

  const { register, handleSubmit, setValue, watch, formState: { isDirty, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: painting
      ? {
          title: painting.title,
          year: painting.year,
          medium: painting.medium,
          widthCm: painting.widthCm,
          heightCm: painting.heightCm,
          depthCm: painting.depthCm,
          price: painting.price,
          currency: painting.currency,
          status: painting.status,
          artistId: painting.artist.id,
          description: painting.description,
          provenance: painting.provenance,
          dominantColor: painting.dominantColor,
        }
      : undefined,
  })

  async function onSave(data: FormData) {
    await updateMutation.mutateAsync({
      ...data,
      year: data.year ?? undefined,
      depthCm: data.depthCm ?? undefined,
      price: data.price ?? undefined,
      medium: data.medium ?? undefined,
      provenance: data.provenance ?? undefined,
      dominantColor: data.dominantColor ?? undefined,
    })
    toast.success('Painting updated')
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync(id)
    toast.success('Painting deleted')
    router.push('/paintings')
  }

  async function downloadQr() {
    const res = await fetch(`/api/proxy/v1/admin/paintings/${id}/qr`)
    if (!res.ok) { toast.error('Failed to generate QR'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `placard-${id}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!painting) {
    return <p className="text-muted-foreground">Painting not found</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="font-serif text-xl font-semibold">{painting.title}</h2>
          <p className="text-sm text-muted-foreground">{painting.artist.name} · {painting.year ?? 'Unknown year'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadQr}>
            <QrCode className="mr-2 h-4 w-4" /> QR Placard
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this painting?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove &quot;{painting.title}&quot; and all associated images.
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
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                {painting.primaryImageUrl ? (
                  <Image src={painting.primaryImageUrl} alt={painting.title} fill className="object-cover" />
                ) : (
                  <div
                    className="h-full w-full flex items-center justify-center text-muted-foreground text-sm"
                    style={{ background: painting.dominantColor ?? '#f3f4f6' }}
                  >
                    No image
                  </div>
                )}
              </div>
              <div className="mt-3">
                <ImageUpload
                  label="Replace primary image"
                  aspectRatio="aspect-video"
                  onUpload={async (file) => { await uploadMutation.mutateAsync(file) }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={painting.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensions</span>
                <span>{formatDimensions(painting.widthCm, painting.heightCm, painting.depthCm)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span>{formatCurrency(painting.price, painting.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added</span>
                <span>{formatDate(painting.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSave)}>
            <Tabs defaultValue="details">
              <TabsList className="mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="provenance">Provenance</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input {...register('title')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Artist</Label>
                    <Select value={watch('artistId')} onValueChange={(v) => setValue('artistId', v, { shouldDirty: true })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {artists?.data.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Year</Label>
                    <Input type="number" {...register('year')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Medium</Label>
                    <Input {...register('medium')} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Width (cm)</Label>
                    <Input type="number" step="0.1" {...register('widthCm')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Height (cm)</Label>
                    <Input type="number" step="0.1" {...register('heightCm')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Depth (cm)</Label>
                    <Input type="number" step="0.1" {...register('depthCm')} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1">
                    <Label>Price</Label>
                    <Input {...register('price')} placeholder="12500.00" />
                  </div>
                  <div className="space-y-1">
                    <Label>Currency</Label>
                    <Select value={watch('currency')} onValueChange={(v) => setValue('currency', v, { shouldDirty: true })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['USD', 'EUR', 'GBP', 'AUD', 'CAD'].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={watch('status')} onValueChange={(v) => setValue('status', v as PaintingStatus, { shouldDirty: true })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.values(PaintingStatus).map((s) => (
                          <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Dominant Color</Label>
                    <div className="flex gap-2">
                      <Input {...register('dominantColor')} placeholder="#8B6914" />
                      {watch('dominantColor') && (
                        <div
                          className="h-10 w-10 shrink-0 rounded-md border"
                          style={{ background: watch('dominantColor') ?? '' }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="description">
                <TiptapEditor
                  value={watch('description')}
                  onChange={(v) => setValue('description', v, { shouldDirty: true })}
                  placeholder="Describe the painting…"
                  className="min-h-[300px]"
                />
              </TabsContent>

              <TabsContent value="provenance">
                <TiptapEditor
                  value={watch('provenance') ?? ''}
                  onChange={(v) => setValue('provenance', v, { shouldDirty: true })}
                  placeholder="Ownership and exhibition history…"
                  className="min-h-[300px]"
                />
              </TabsContent>
            </Tabs>

            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={!isDirty || isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
