import type { LucideIcon } from 'lucide-react'

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

type MetricCardProps = {
  label: string
  value: string
  trend: string
  icon: LucideIcon
}

export function MetricCard({ label, value, trend, icon: Icon }: MetricCardProps) {
  return (
    <Card size="sm" className="surface-motion">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        <CardAction>
          <Icon className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
      </CardContent>
    </Card>
  )
}
