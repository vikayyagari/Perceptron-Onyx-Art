import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/auth'
import { TopNav } from '@/components/layout/top-nav'
import { GalleriesClient } from './galleries-client'

export const metadata = { title: 'Galleries' }

export default async function GalleriesPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')
  if (!isSuperAdmin(session)) redirect('/')

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Galleries" adminEmail="admin" role={session.role} />
      <div className="flex-1 p-6">
        <GalleriesClient />
      </div>
    </div>
  )
}
