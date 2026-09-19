import type { LabExecutionStepRecord } from '#/api/lab-operations'
import { offsetLabel } from './step-performance'

export function StepPerformanceEvidence({ record, people }: { record: LabExecutionStepRecord; people: ReadonlyMap<string, string> }) {
  const performance = record.performance
  const name = (id: string) => people.get(id) || `User ${id}`
  const originalTime = performance ? new Date(Date.parse(performance.performedAtUtc) + performance.utcOffsetMinutes * 60000).toLocaleString('en-US', {
    timeZone: 'UTC', year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit', ...(performance.precision === 'server' ? { second: '2-digit' as const } : {}),
  }) : null
  return <div className="space-y-1 text-xs text-muted-foreground">
    {record.outcome === 'skipped' ? <p>Skipped — no performed work claimed.</p> : performance ? <>
      <p>Performed by {name(performance.performedByUserId)} · {originalTime} (UTC{offsetLabel(performance.utcOffsetMinutes)}) · {performance.entryMode === 'earlier' ? 'Late entry; minute precision' : 'Confirmed at recording time'}</p>
      {performance.lateEntryReason ? <p className="whitespace-pre-wrap">Late-entry reason: {performance.lateEntryReason}</p> : null}
      {performance.verificationStatus === 'PendingReview' ? <p>Original on-behalf entry; independent approval and any later changes are shown in Sample history.</p> : null}
    </> : <p>Performed time and performer were not captured separately.</p>}
    <p>Recorded by {name(record.recordedByUserId)} · {new Date(record.recordedAtUtc).toLocaleString('en-US', { timeZoneName: 'short' })}</p>
    {record.correctsRecordId ? <p>Correction preserves the earlier performance evidence.</p> : null}
  </div>
}
