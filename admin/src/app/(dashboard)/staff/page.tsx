import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { TopNav } from '@/components/layout/top-nav'
import { StaffClient } from './staff-client'

export const metadata = { title: 'Staff Management' }

export default async function StaffPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Staff Management" adminEmail="admin" role={session.role} />
      <div className="flex-1 p-6">
        <StaffClient currentRole={session.role} />
      </div>
    </div>
  )
}
