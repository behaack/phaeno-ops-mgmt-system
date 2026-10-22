import type { ReactNode } from 'react'
import { StatusBadge, type StatusTone } from './status-badge'

export type StatusMap = Readonly<Record<string, StatusTone>>

/** Feature-owned maps provide meaning. New/unknown server values remain neutral. */
export function DomainStatusBadge({ status, tones, children, className }: { status: string; tones: StatusMap; children?: ReactNode; className?: string }) {
  return <StatusBadge tone={Object.hasOwn(tones, status) ? tones[status] : 'neutral'} className={className}>{children ?? status}</StatusBadge>
}
