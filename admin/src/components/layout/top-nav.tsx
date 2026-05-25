import { ThemeToggle } from './theme-toggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { GalleryStaffRole } from '@perceptron/shared'
import { getInitials } from '@/lib/utils'

interface TopNavProps {
  title: string
  adminEmail: string
  role: GalleryStaffRole
  children?: React.ReactNode
}

const roleLabels: Record<GalleryStaffRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  GALLERY_ADMIN: 'Gallery Admin',
  GALLERY_STAFF: 'Staff',
}

const roleBadge: Record<GalleryStaffRole, 'default' | 'warning' | 'info'> = {
  SUPER_ADMIN: 'default',
  GALLERY_ADMIN: 'warning',
  GALLERY_STAFF: 'info',
}

export function TopNav({ title, adminEmail, role, children }: TopNavProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="font-serif text-lg font-semibold">{title}</h1>
        {children}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Badge variant={roleBadge[role]}>{roleLabels[role]}</Badge>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(adminEmail)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
