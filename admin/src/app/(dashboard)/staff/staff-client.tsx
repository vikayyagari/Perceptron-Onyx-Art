'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Loader2, Trash2 } from 'lucide-react'
import { useStaff, useCreateStaff, useDeleteStaff } from '@/hooks/use-staff'
import { useGalleries } from '@/hooks/use-galleries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatDate, formatDateTime } from '@/lib/utils'
import { GalleryStaffRole } from '@perceptron/shared'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
  role: z.nativeEnum(GalleryStaffRole),
  galleryId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const ROLE_BADGES: Record<GalleryStaffRole, 'default' | 'warning' | 'info'> = {
  SUPER_ADMIN: 'default',
  GALLERY_ADMIN: 'warning',
  GALLERY_STAFF: 'info',
}

interface Props {
  currentRole: GalleryStaffRole
}

export function StaffClient({ currentRole }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useStaff({ limit: 50 })
  const { data: galleries } = useGalleries()
  const createMutation = useCreateStaff()
  const deleteMutation = useDeleteStaff()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: GalleryStaffRole.GALLERY_STAFF },
  })

  async function onCreate(data: FormData) {
    await createMutation.mutateAsync({
      ...data,
      galleryId: data.galleryId || undefined,
    })
    toast.success('Staff account created')
    setShowCreate(false)
    form.reset()
  }

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
          <Plus className="mr-2 h-4 w-4" /> Add Staff
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
              {currentRole === 'SUPER_ADMIN' && (
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.data.map((staff) => (
              <tr key={staff.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{staff.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={ROLE_BADGES[staff.role]}>
                    {staff.role.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(staff.createdAt)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {staff.lastLoginAt ? formatDateTime(staff.lastLoginAt) : 'Never'}
                </td>
                {currentRole === 'SUPER_ADMIN' && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(staff.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No staff accounts
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Staff Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" {...form.register('password')} />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(v) => form.setValue('role', v as GalleryStaffRole)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(GalleryStaffRole).map((r) => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.watch('role') !== 'SUPER_ADMIN' && (
              <div className="space-y-1">
                <Label>Gallery</Label>
                <Select
                  value={form.watch('galleryId') ?? ''}
                  onValueChange={(v) => form.setValue('galleryId', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select gallery" /></SelectTrigger>
                  <SelectContent>
                    {galleries?.data.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove staff account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the staff account. They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return
                await deleteMutation.mutateAsync(deleteId)
                toast.success('Staff account removed')
                setDeleteId(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
