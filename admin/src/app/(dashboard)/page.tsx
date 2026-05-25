import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { TopNav } from '@/components/layout/top-nav'
import { DashboardClient } from './dashboard-client'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col h-full">
      <TopNav
        title="Dashboard"
        adminEmail="admin"
        role={session.role}
      />
      <div className="flex-1 p-6">
        <DashboardClient galleryId={session.galleryId ?? undefined} />
      </div>
    </div>
  )
}
