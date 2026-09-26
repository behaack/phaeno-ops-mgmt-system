import { Badge } from '#/components/ui/badge'

type ShippingActivation = {
  isActive: boolean
  effectiveFrom: string
  effectiveTo: string | null
  deactivatedAt?: string | null
}

export function ShippingActivationBadge({ item }: { item: ShippingActivation }) {
  const active = item.isActive && !item.deactivatedAt
  const now = Date.now()
  const timing = active
    ? item.effectiveTo && new Date(item.effectiveTo).getTime() <= now
      ? 'Ended'
      : new Date(item.effectiveFrom).getTime() > now
        ? 'Scheduled'
        : null
    : null

  return <>
    <Badge variant={active ? 'secondary' : 'outline'}>{active ? 'Active' : 'Inactive'}</Badge>
    {timing ? <Badge variant="outline">{timing}</Badge> : null}
  </>
}
