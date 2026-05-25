import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { TopNav } from '@/components/layout/top-nav'
import { PaintingsTable } from '@/components/paintings/paintings-table'

export const metadata = { title: 'Paintings' }

export default async function PaintingsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Paintings" adminEmail="admin" role={session.role} />
      <div className="flex-1 p-6">
        <PaintingsTable galleryId={session.galleryId ?? undefined} />
      </div>
    </div>
  )
}
