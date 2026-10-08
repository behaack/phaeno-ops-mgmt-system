import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getInvestigationEvents, type EventCursor } from '#/api/lab-investigation'
import { EvidenceDetails, EvidenceError, EvidencePages, evidenceDate, evidenceLabel } from './InvestigationEvidence'

export function InvestigationEventHistory({ workOrderId, specimenId, through }: { workOrderId: string; specimenId: string; through: string }) {
  const [cursors, setCursors] = useState<EventCursor[]>([{ through }])
  const [page, setPage] = useState(0)
  const query = useQuery({ queryKey: ['investigation-events', workOrderId, specimenId, cursors[page]], queryFn: () => getInvestigationEvents(workOrderId, specimenId, cursors[page]), staleTime: Infinity })
  const changePage = (target: number) => {
    if (target > page && !cursors[target] && query.data?.next) setCursors([...cursors, { through: query.data.through, ...query.data.next }])
    setPage(target)
  }
  return <details className="rounded-lg border"><summary className="cursor-pointer bg-muted/50 p-3 text-sm font-medium">Event history</summary><div className="space-y-3 p-3">
    {query.isPending ? <p role="status">Loading events…</p> : query.isError ? <EvidenceError error={query.error} /> : <>
      {query.data.rows.map(row => <details key={row.id} className="rounded-md border p-3 text-sm"><summary className="cursor-pointer">{evidenceLabel(String(row.eventCode))} · {evidenceDate(row.occurredAtUtc)}</summary><div className="mt-3"><EvidenceDetails value={row} /></div></details>)}
      {!query.data.rows.length ? <p className="text-sm">No events recorded.</p> : null}<EvidencePages page={page} next={Boolean(query.data.next)} onChange={changePage} />
    </>}
  </div></details>
}
