import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { TopNav } from '@/components/layout/top-nav'
import { PhotographyClient } from './photography-client'

export const metadata = { title: 'Photography Helper' }

export default async function PhotographyPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Photography Helper" adminEmail="admin" role={session.role} />
      <div className="flex-1 overflow-hidden">
        <PhotographyClient />
      </div>
    </div>
  )
}
