import type { VendorSequencingRunCapture } from '#/api/lab-operations'
import { DetailField, DetailSummary } from '#/components/ui/detail-summary'
import { formatDisplayTimestamp } from '#/lib/display-format'

export function VendorRunEvidence({ run }: { run: VendorSequencingRunCapture }) {
  const e = run.scientificEvidence
  return <div className="space-y-3"><DetailSummary>
    <DetailField label="Actual sequencing run" value={run.runReference} />
    <DetailField label="Started" value={formatDisplayTimestamp(e.runStartedAtUtc, { seconds: true })} />
    <DetailField label="Completed" value={formatDisplayTimestamp(e.runCompletedAtUtc, { seconds: true })} />
    <DetailField label="Instrument" value={e.instrument} /><DetailField label="Flowcell" value={e.flowcell} />
    <DetailField label="Lane" value={e.lane} /><DetailField label="Pool" value={e.pool} /><DetailField label="Index / demultiplexing mapping" value={e.indexMapping} />
    <DetailField label="Demultiplexing settings SHA-256" value={e.parametersSha256} mono />
    <DetailField label="Software" value={e.software?.map(s => `${s.name} ${s.version}${s.sha256 ? ` · ${s.sha256}` : ''}`).join('\n')} />
  </DetailSummary>{e.documents?.length ? <ul className="space-y-2 text-xs">{e.documents.map(d => <li key={`${d.role}:${d.externalFileReference}`} className="break-words">{d.role} · {d.externalFileReference} · {d.sizeBytes} bytes · SHA-256 {d.sha256}</li>)}</ul> : null}</div>
}
