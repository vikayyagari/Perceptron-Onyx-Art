'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Palette,
  UserCircle,
  MessageSquare,
  Building2,
  Users,
  Camera,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GalleryStaffRole } from '@perceptron/shared'

interface SidebarProps {
  role: GalleryStaffRole
}

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/paintings', label: 'Paintings', icon: Palette },
  { href: '/artists', label: 'Artists', icon: UserCircle },
  { href: '/inquiries', label: 'Inquiries', icon: MessageSquare },
  { href: '/staff', label: 'Staff', icon: Users },
  { href: '/photography', label: 'Photography', icon: Camera },
]

const SUPER_ADMIN_ITEMS = [
  { href: '/galleries', label: 'Galleries', icon: Building2 },
]

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const items = role === 'SUPER_ADMIN' ? [...NAV_ITEMS, ...SUPER_ADMIN_ITEMS] : NAV_ITEMS

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <span className="text-xs font-bold text-primary-foreground">P</span>
        </div>
        <div>
          <p className="font-serif text-sm font-semibold leading-tight">Perceptron</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Admin</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
