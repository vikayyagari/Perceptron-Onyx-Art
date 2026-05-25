import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { TopNav } from '@/components/layout/top-nav'
import { InquiriesClient } from './inquiries-client'

export const metadata = { title: 'Inquiries' }

export default async function InquiriesPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Inquiries" adminEmail="admin" role={session.role} />
      <div className="flex-1 p-6">
        <InquiriesClient galleryId={session.galleryId ?? undefined} />
      </div>
    </div>
  )
}
