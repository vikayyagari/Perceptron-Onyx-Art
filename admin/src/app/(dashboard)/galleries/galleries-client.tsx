'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Loader2, Pencil, Building2, Globe, Mail, Phone } from 'lucide-react'
import { useGalleries, useCreateGallery, useUpdateGallery } from '@/hooks/use-galleries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { GalleryPublic } from '@perceptron/shared'

const schema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  timezone: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  brandPrimaryColor: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function GalleriesClient() {
  const [showCreate, setShowCreate] = useState(false)
  const [editGallery, setEditGallery] = useState<GalleryPublic | null>(null)

  const { data, isLoading } = useGalleries()
  const createMutation = useCreateGallery()

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Gallery
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((gallery) => (
          <div key={gallery.id} className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {gallery.brandPrimaryColor ? (
                  <div
                    className="h-10 w-10 rounded-lg border flex items-center justify-center"
                    style={{ background: gallery.brandPrimaryColor }}
                  >
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{gallery.name}</p>
                  <p className="text-xs text-muted-foreground">{gallery.city}, {gallery.country}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditGallery(gallery)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{gallery.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{gallery.contactEmail}</span>
              </div>
              {gallery.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{gallery.contactPhone}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <GalleryFormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data)
          toast.success('Gallery created')
          setShowCreate(false)
        }}
        isPending={createMutation.isPending}
      />

      {editGallery && (
        <GalleryEditDialog gallery={editGallery} onClose={() => setEditGallery(null)} />
      )}
    </div>
  )
}

function GalleryFormDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  defaultValues,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  isPending: boolean
  defaultValues?: Partial<FormData>
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Edit Gallery' : 'New Gallery'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Gallery Name</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Address</Label>
            <Input {...register('address')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>City</Label>
              <Input {...register('city')} />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input {...register('country')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Timezone</Label>
              <Input {...register('timezone')} placeholder="America/New_York" />
            </div>
            <div className="space-y-1">
              <Label>Brand Color</Label>
              <Input {...register('brandPrimaryColor')} placeholder="#8B6914" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Contact Email</Label>
              <Input type="email" {...register('contactEmail')} />
              {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Contact Phone</Label>
              <Input {...register('contactPhone')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GalleryEditDialog({ gallery, onClose }: { gallery: GalleryPublic; onClose: () => void }) {
  const updateMutation = useUpdateGallery(gallery.id)

  return (
    <GalleryFormDialog
      open
      onClose={onClose}
      defaultValues={{
        name: gallery.name,
        address: gallery.address,
        city: gallery.city,
        country: gallery.country,
        timezone: gallery.timezone,
        contactEmail: gallery.contactEmail,
        contactPhone: gallery.contactPhone ?? undefined,
        brandPrimaryColor: gallery.brandPrimaryColor ?? undefined,
      }}
      isPending={updateMutation.isPending}
      onSubmit={async (data) => {
        await updateMutation.mutateAsync(data)
        toast.success('Gallery updated')
        onClose()
      }}
    />
  )
}
