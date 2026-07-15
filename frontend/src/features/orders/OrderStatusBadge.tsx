import { Badge } from '#/components/ui/badge'

export function OrderStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const variant = normalized.includes('cancel') || normalized.includes('reject') || normalized.includes('declin')
    ? 'destructive'
    : normalized.includes('hold') || normalized.includes('pending') || normalized.includes('review')
      ? 'outline'
      : 'secondary'

  return <Badge variant={variant}>{humanizeStatus(status)}</Badge>
}

export function humanizeStatus(status: string) {
  return status
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}
