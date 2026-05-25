import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { TopNav } from '@/components/layout/top-nav'
import { ArtistsClient } from './artists-client'

export const metadata = { title: 'Artists' }

export default async function ArtistsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Artists" adminEmail="admin" role={session.role} />
      <div className="flex-1 p-6">
        <ArtistsClient />
      </div>
    </div>
  )
}
