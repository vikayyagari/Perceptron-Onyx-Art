'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { useCreatePainting } from '@/hooks/use-paintings'
import { useArtists } from '@/hooks/use-artists'
import { useGalleries } from '@/hooks/use-galleries'
import { TiptapEditor } from '@/components/tiptap-editor'
import { ImageUpload } from '@/components/image-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { PaintingStatus } from '@perceptron/shared'
import type { GalleryStaffRole } from '@perceptron/shared'

const step1Schema = z.object({
  galleryId: z.string().min(1, 'Select a gallery'),
  artistId: z.string().min(1, 'Select an artist'),
  title: z.string().min(1, 'Title required'),
  year: z.coerce.number().int().min(1000).max(2100).optional(),
  medium: z.string().optional(),
})

const step2Schema = z.object({
  widthCm: z.coerce.number().positive('Must be positive'),
  heightCm: z.coerce.number().positive('Must be positive'),
  depthCm: z.coerce.number().positive().optional(),
  price: z.string().optional(),
  currency: z.string().default('USD'),
  status: z.nativeEnum(PaintingStatus).default(PaintingStatus.AVAILABLE),
})

const step3Schema = z.object({
  description: z.string().min(1, 'Description required'),
  provenance: z.string().optional(),
  dominantColor: z.string().optional(),
})

type Step1 = z.infer<typeof step1Schema>
type Step2 = z.infer<typeof step2Schema>
type Step3 = z.infer<typeof step3Schema>

interface Props {
  role: GalleryStaffRole
  defaultGalleryId?: string
}

const STEPS = ['Details', 'Dimensions & Pricing', 'Description & Image']

export function PaintingWizard({ role, defaultGalleryId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [step1Data, setStep1Data] = useState<Step1 | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const { data: galleries } = useGalleries()
  const { data: artists } = useArtists({ limit: 100 })
  const createMutation = useCreatePainting()

  const form1 = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: { galleryId: defaultGalleryId ?? '' },
  })
  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: { currency: 'USD', status: PaintingStatus.AVAILABLE },
  })
  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: { description: '' },
  })

  async function onStep1(data: Step1) {
    setStep1Data(data)
    setStep(1)
  }

  async function onStep2(data: Step2) {
    if (!step1Data) return

    try {
      const painting = await createMutation.mutateAsync({
        ...step1Data,
        ...data,
        year: step1Data.year,
        price: data.price || undefined,
        description: '',
      })
      setCreatedId(painting.id)
      setStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create painting')
    }
  }

  async function onStep3(data: Step3) {
    if (!createdId) return
    try {
      await fetch(`/api/proxy/v1/admin/paintings/${createdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin',
      })

      if (uploadFile) {
        const fd = new FormData()
        fd.append('image', uploadFile)
        await fetch(`/api/proxy/v1/admin/paintings/${createdId}/images`, {
          method: 'POST',
          body: fd,
          credentials: 'same-origin',
        })
      }

      toast.success('Painting created successfully')
      router.push(`/paintings/${createdId}`)
    } catch {
      toast.error('Failed to save description')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          {STEPS.map((s, i) => (
            <span key={s} className={i === step ? 'text-foreground font-medium' : ''}>{s}</span>
          ))}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
      </div>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Painting Details</CardTitle>
            <CardDescription>Basic identification information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">
              {role === 'SUPER_ADMIN' && (
                <div className="space-y-1">
                  <Label>Gallery</Label>
                  <Select
                    value={form1.watch('galleryId')}
                    onValueChange={(v) => form1.setValue('galleryId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gallery" />
                    </SelectTrigger>
                    <SelectContent>
                      {galleries?.data.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form1.formState.errors.galleryId && (
                    <p className="text-xs text-destructive">{form1.formState.errors.galleryId.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label>Artist</Label>
                <Select
                  value={form1.watch('artistId')}
                  onValueChange={(v) => form1.setValue('artistId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists?.data.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form1.formState.errors.artistId && (
                  <p className="text-xs text-destructive">{form1.formState.errors.artistId.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Title</Label>
                <Input {...form1.register('title')} placeholder="Untitled" />
                {form1.formState.errors.title && (
                  <p className="text-xs text-destructive">{form1.formState.errors.title.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Year (optional)</Label>
                  <Input type="number" {...form1.register('year')} placeholder="2024" />
                </div>
                <div className="space-y-1">
                  <Label>Medium (optional)</Label>
                  <Input {...form1.register('medium')} placeholder="Oil on canvas" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit">
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Dimensions & Pricing</CardTitle>
            <CardDescription>Physical measurements and sale information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Width (cm)</Label>
                  <Input type="number" step="0.1" {...form2.register('widthCm')} />
                  {form2.formState.errors.widthCm && (
                    <p className="text-xs text-destructive">{form2.formState.errors.widthCm.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Height (cm)</Label>
                  <Input type="number" step="0.1" {...form2.register('heightCm')} />
                  {form2.formState.errors.heightCm && (
                    <p className="text-xs text-destructive">{form2.formState.errors.heightCm.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Depth (cm, opt.)</Label>
                  <Input type="number" step="0.1" {...form2.register('depthCm')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Price (optional)</Label>
                  <Input {...form2.register('price')} placeholder="12500.00" />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select
                    value={form2.watch('currency')}
                    onValueChange={(v) => form2.setValue('currency', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['USD', 'EUR', 'GBP', 'AUD', 'CAD'].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form2.watch('status')}
                  onValueChange={(v) => form2.setValue('status', v as PaintingStatus)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(PaintingStatus).map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Description & Image</CardTitle>
            <CardDescription>Catalogue text and primary photo</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form3.handleSubmit(onStep3)} className="space-y-4">
              <div className="space-y-1">
                <Label>Description</Label>
                <TiptapEditor
                  value={form3.watch('description')}
                  onChange={(v) => form3.setValue('description', v)}
                  placeholder="Describe the painting…"
                />
                {form3.formState.errors.description && (
                  <p className="text-xs text-destructive">{form3.formState.errors.description.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Provenance (optional)</Label>
                <TiptapEditor
                  value={form3.watch('provenance') ?? ''}
                  onChange={(v) => form3.setValue('provenance', v)}
                  placeholder="Ownership history…"
                />
              </div>

              <div className="space-y-1">
                <Label>Primary Image</Label>
                <ImageUpload
                  label="Upload painting photo"
                  aspectRatio="aspect-video"
                  onUpload={async (file) => setUploadFile(file)}
                />
              </div>

              <div className="space-y-1">
                <Label>Dominant Color (hex, optional)</Label>
                <Input {...form3.register('dominantColor')} placeholder="#8B6914" />
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button type="submit" disabled={form3.formState.isSubmitting}>
                  {form3.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Painting
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
