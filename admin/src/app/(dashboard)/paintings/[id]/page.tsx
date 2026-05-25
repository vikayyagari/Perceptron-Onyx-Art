import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { TopNav } from '@/components/layout/top-nav'
import { PaintingDetailClient } from './painting-detail-client'

interface Props {
  params: { id: string }
}

export const metadata = { title: 'Painting Detail' }

export default async function PaintingDetailPage({ params }: Props) {
  const session = await getAdminSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Painting Detail" adminEmail="admin" role={session.role} />
      <div className="flex-1 p-6">
        <PaintingDetailClient id={params.id} />
      </div>
    </div>
  )
}
