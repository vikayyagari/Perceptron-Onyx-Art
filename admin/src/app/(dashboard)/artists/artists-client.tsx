'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Loader2, Trash2, Pencil } from 'lucide-react'
import { useArtists, useCreateArtist, useUpdateArtist, useDeleteArtist } from '@/hooks/use-artists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getInitials } from '@/lib/utils'
import type { ArtistPublic } from '@perceptron/shared'

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  bio: z.string().min(1),
  birthYear: z.coerce.number().int().min(1000).max(2100).optional(),
  deathYear: z.coerce.number().int().min(1000).max(2100).optional(),
  nationality: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function ArtistsClient() {
  const [editArtist, setEditArtist] = useState<ArtistPublic | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useArtists({ limit: 50 })
  const createMutation = useCreateArtist()
  const deleteMutation = useDeleteArtist()

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
          <Plus className="mr-2 h-4 w-4" /> Add Artist
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((artist) => (
          <div key={artist.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border">
                {artist.portraitImageUrl ? (
                  <Image src={artist.portraitImageUrl} alt={artist.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm font-medium">
                    {getInitials(artist.name)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{artist.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[artist.nationality, artist.birthYear && `b. ${artist.birthYear}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditArtist(artist)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(artist.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3">{artist.bio}</p>
          </div>
        ))}
      </div>

      <ArtistFormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data)
          toast.success('Artist created')
          setShowCreate(false)
        }}
        isPending={createMutation.isPending}
      />

      {editArtist && (
        <ArtistEditDialog
          artist={editArtist}
          onClose={() => setEditArtist(null)}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete artist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the artist. Paintings by this artist will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return
                await deleteMutation.mutateAsync(deleteId)
                toast.success('Artist deleted')
                setDeleteId(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ArtistFormDialog({
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
          <DialogTitle>{defaultValues ? 'Edit Artist' : 'New Artist'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Slug</Label>
              <Input {...register('slug')} placeholder="john-doe" />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Nationality</Label>
              <Input {...register('nationality')} placeholder="American" />
            </div>
            <div className="space-y-1">
              <Label>Birth Year</Label>
              <Input type="number" {...register('birthYear')} placeholder="1950" />
            </div>
            <div className="space-y-1">
              <Label>Death Year</Label>
              <Input type="number" {...register('deathYear')} placeholder="optional" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Bio</Label>
            <Textarea {...register('bio')} rows={4} />
            {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
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

function ArtistEditDialog({ artist, onClose }: { artist: ArtistPublic; onClose: () => void }) {
  const updateMutation = useUpdateArtist(artist.id)

  return (
    <ArtistFormDialog
      open
      onClose={onClose}
      defaultValues={{
        name: artist.name,
        slug: artist.slug,
        bio: artist.bio,
        birthYear: artist.birthYear ?? undefined,
        deathYear: artist.deathYear ?? undefined,
        nationality: artist.nationality ?? undefined,
      }}
      isPending={updateMutation.isPending}
      onSubmit={async (data) => {
        await updateMutation.mutateAsync(data)
        toast.success('Artist updated')
        onClose()
      }}
    />
  )
}
