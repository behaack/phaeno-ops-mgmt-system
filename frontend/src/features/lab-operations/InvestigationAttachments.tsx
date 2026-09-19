import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { downloadInvestigationAttachment, type EvidenceRow } from '#/api/lab-investigation'
import { Button } from '#/components/ui/button'
import { EvidenceDetails, EvidenceError, EvidencePages, evidenceDate } from './InvestigationEvidence'

export function InvestigationAttachments({ workOrderId, specimenId, rows }: { workOrderId: string; specimenId: string; rows: EvidenceRow[] }) {
  const [page, setPage] = useState(0)
  return <details className="rounded-lg border">
    <summary className="cursor-pointer bg-muted/50 p-3 text-sm font-medium">Supporting reports ({rows.length})</summary>
    <div className="space-y-3 p-3">
      <p className="text-xs text-muted-foreground">These reports were attached to steps covering this sample. Each download checks access, scanning, file size and the recorded checksum. Saved metadata alone does not confirm file availability.</p>
      {rows.slice(page * 10, page * 10 + 10).map(row => <Attachment key={`${row.id}-${String(row.role)}`} workOrderId={workOrderId} specimenId={specimenId} row={row} />)}
      {!rows.length ? <p className="text-sm">No supporting reports recorded.</p> : null}
      {rows.length > 10 ? <EvidencePages page={page} next={rows.length > (page + 1) * 10} onChange={setPage} /> : null}
    </div>
  </details>
}

function Attachment({ workOrderId, specimenId, row }: { workOrderId: string; specimenId: string; row: EvidenceRow }) {
  const name = String(row.fileName ?? 'Supporting report')
  const clean = row.scanStatus === 'Clean'
  const download = useMutation({ mutationFn: async () => {
    const blob = await downloadInvestigationAttachment(workOrderId, specimenId, row.id, String(row.role))
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = name
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } })
  return <div className="space-y-3 rounded-md border p-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1"><h4 className="break-all text-sm font-medium">{name}</h4><p className="text-xs text-muted-foreground">{row.role === 'qcReport' ? 'QC report' : 'Preparation report'} · {evidenceDate(row.recordedAtUtc)}</p></div>
      <Button variant="outline" size="sm" disabled={!clean || download.isPending} aria-label={`Download ${name}`} onClick={() => download.mutate()}>{download.isPending ? 'Checking report…' : 'Download report'}</Button>
    </div>
    {!clean ? <p className="text-sm">This report has not passed scanning and cannot be downloaded.</p> : null}
    {download.isError ? <EvidenceError error={download.error} /> : null}
    {download.isSuccess ? <p role="status" className="text-sm">Report verified; download started.</p> : null}
    <details className="text-sm"><summary className="cursor-pointer">Recorded report details</summary><div className="mt-2"><EvidenceDetails value={row} /></div></details>
  </div>
}
