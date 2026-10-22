import { Link } from '@tanstack/react-router'
import { RecordLink } from '#/components/ui/record-link'
import type { InstructionSource } from './procedure-types'
import { procedureDetailRoute } from './procedure-navigation'

export function ProcedureSource({ source }: { source?: InstructionSource | null }) {
  if (!source) return null
  return <p className="text-xs text-muted-foreground">Copied from approved revision {source.revision}. This procedure owns its copy.{' '}
    <RecordLink asChild><Link to={procedureDetailRoute} params={{ kind: source.kind === 'library' ? 'protocol' : source.kind, recordId: source.recordId }} search={{ revision: Number(source.revision) }} target="_blank" rel="noreferrer">View source revision<span className="sr-only"> (opens a new tab)</span></Link></RecordLink>
  </p>
}
