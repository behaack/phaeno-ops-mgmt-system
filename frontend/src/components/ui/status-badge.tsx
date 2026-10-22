import type { ReactNode } from 'react'
import { Badge } from './badge'

export type StatusTone = 'neutral' | 'info' | 'pending' | 'success' | 'warning' | 'error'
const tones: Record<StatusTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  info: 'border-primary/30 bg-primary/10 text-primary',
  pending: 'border-warning-border bg-warning-background text-warning',
  success: 'border-success-border bg-success-background text-success',
  warning: 'border-warning-border bg-warning-background text-warning',
  error: 'border-destructive/40 bg-destructive/10 text-destructive',
}

/** Domain adapters supply an explicit tone; labels never determine meaning. */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return <Badge variant="outline" data-slot="status-badge" data-tone={tone} className={`h-auto min-h-5 max-w-full whitespace-normal text-left ${tones[tone]}`}>{children}</Badge>
}
