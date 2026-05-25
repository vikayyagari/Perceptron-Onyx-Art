import { Badge } from '@/components/ui/badge'
import type { PaintingStatus } from '@perceptron/shared'

const CONFIG: Record<
  PaintingStatus,
  { label: string; variant: 'success' | 'secondary' | 'warning' | 'info' | 'destructive' }
> = {
  AVAILABLE: { label: 'Available', variant: 'success' },
  SOLD: { label: 'Sold', variant: 'secondary' },
  ON_LOAN: { label: 'On Loan', variant: 'warning' },
  IN_STORAGE: { label: 'In Storage', variant: 'info' },
  ARCHIVED: { label: 'Archived', variant: 'destructive' },
}

export function StatusBadge({ status }: { status: PaintingStatus }) {
  const { label, variant } = CONFIG[status] ?? { label: status, variant: 'secondary' as const }
  return <Badge variant={variant}>{label}</Badge>
}
