import { DisplayTimestamp } from '#/components/ui/display-value'
import type { LabExecutionStepRecord } from '#/api/lab-operations'
import { formatRecordedTimestamp } from '#/lib/display-format'

export function StepPerformanceEvidence({ record, people }: { record: LabExecutionStepRecord; people: ReadonlyMap<string, string> }) {
  const performance = record.performance
  const name = (id: string) => people.get(id) || `User ${id}`
  const originalTime = performance ? formatRecordedTimestamp(performance.performedAtUtc, performance.utcOffsetMinutes, performance.precision) : null
  return <div className="space-y-1 text-xs text-muted-foreground">
    {record.outcome === 'skipped' ? <p>Skipped — no performed work claimed.</p> : performance ? <>
      <p>Performed by {name(performance.performedByUserId)} · {originalTime} · {performance.entryMode === 'earlier' ? 'Late entry; minute precision' : 'Confirmed at recording time'}</p>
      {performance.lateEntryReason ? <p className="whitespace-pre-wrap">Late-entry reason: {performance.lateEntryReason}</p> : null}
      {performance.verificationStatus === 'PendingReview' ? <p>Original on-behalf entry; independent approval and any later changes are shown in Sample history.</p> : null}
    </> : <p>Performed time and performer were not captured separately.</p>}
    <p>Recorded by {name(record.recordedByUserId)} · {<DisplayTimestamp value={record.recordedAtUtc} seconds />}</p>
    {record.correctsRecordId ? <p>Correction preserves the earlier performance evidence.</p> : null}
  </div>
}
