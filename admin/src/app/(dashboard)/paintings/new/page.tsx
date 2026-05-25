import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { TopNav } from '@/components/layout/top-nav'
import { PaintingWizard } from '@/components/paintings/painting-wizard'

export const metadata = { title: 'New Painting' }

export default async function NewPaintingPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col h-full">
      <TopNav title="New Painting" adminEmail="admin" role={session.role} />
      <div className="flex-1 p-6">
        <PaintingWizard role={session.role} defaultGalleryId={session.galleryId ?? undefined} />
      </div>
    </div>
  )
}
