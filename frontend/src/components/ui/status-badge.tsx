import type { ReactNode } from 'react'
import { Badge } from './badge'
import { cn } from '#/lib/utils'

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
export function StatusBadge({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return <Badge variant="outline" data-slot="status-badge" data-tone={tone} className={cn('h-auto min-h-5 max-w-full whitespace-normal text-left', tones[tone], className)}>{children}</Badge>
}
