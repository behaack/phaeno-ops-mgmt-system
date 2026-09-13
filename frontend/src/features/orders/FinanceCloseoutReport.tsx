import { useState } from 'react'
import { z } from 'zod'
import type { ReconciliationBatch } from '#/api/pseq-order-to-cash'
import { Button } from '#/components/ui/button'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const date = z.string().refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value)
const snapshot = z.object({ periodEnd: date, bankTotal: z.number(), ledgerReceiptTotal: z.number(), paymentReceiptIds: z.array(z.string()), paymentAllocationIds: z.array(z.string()), invoiceAdjustmentIds: z.array(z.string()) })
const reportSchema = z.object({
  batchNumber: z.string().min(1), periodEnd: date, bankTotal: z.number(), ledgerReceiptTotal: z.number(), difference: z.number(), itemCount: z.number().int().nonnegative(),
  approvedByUserId: z.string().min(1), approvedAtUtc: z.string().datetime({ offset: true }),
  draftChanges: z.array(z.object({ action: z.string(), actorUserId: z.string(), atUtc: z.string().datetime({ offset: true }), reason: z.string(), before: snapshot, after: snapshot })).optional(),
})
type CloseoutReport = z.infer<typeof reportSchema>

function readReport(batch: ReconciliationBatch): CloseoutReport | null {
  if (batch.status !== 'Approved' || !batch.closeoutReportJson) return null
  try {
    const parsed = reportSchema.safeParse(JSON.parse(batch.closeoutReportJson))
    if (!parsed.success) return null
    const report = parsed.data
    return report.batchNumber === batch.batchNumber && report.periodEnd === batch.periodEnd && report.approvedByUserId === batch.approvedByUserId
      && report.bankTotal === batch.bankTotal && report.ledgerReceiptTotal === batch.ledgerReceiptTotal && report.difference === batch.difference ? report : null
  } catch { return null }
}

function reportText(report: CloseoutReport) {
  const lines = ['POMS — Reconciliation closeout report', report.batchNumber, '', 'Status: Approved', `Period end: ${report.periodEnd}`, `Bank total: ${money(report.bankTotal)}`, `Ledger receipts: ${money(report.ledgerReceiptTotal)}`, `Difference: ${money(report.difference)}`, `Included records: ${report.itemCount}`, `Approved at (UTC): ${report.approvedAtUtc}`, `Reviewer reference: ${report.approvedByUserId}`]
  if (report.draftChanges) {
    lines.push('', 'Recorded draft changes')
    if (!report.draftChanges.length) lines.push('No draft changes recorded.')
    for (const change of report.draftChanges) {
      lines.push('', `${change.action} at ${change.atUtc}`, `Operator reference: ${change.actorUserId}`, `Reason: ${change.reason}`)
      for (const [label, value] of [['Before', change.before], ['After', change.after]] as const) {
        lines.push(`${label}: period ${value.periodEnd}; bank ${money(value.bankTotal)}; ledger ${money(value.ledgerReceiptTotal)}`, `Receipt references: ${value.paymentReceiptIds.join(', ') || 'None'}`, `Allocation references: ${value.paymentAllocationIds.join(', ') || 'None'}`, `Adjustment references: ${value.invoiceAdjustmentIds.join(', ') || 'None'}`)
      }
    }
  }
  return [...lines, '', 'This copy presents the saved approval evidence. It does not change the approved reconciliation.', ''].join('\r\n')
}

export function FinanceCloseoutReport({ batch }: { batch: ReconciliationBatch }) {
  const [downloadFailed, setDownloadFailed] = useState(false)
  const report = readReport(batch)
  if (!report) return <p role="alert" className="text-sm text-destructive">The saved closeout report is unavailable or does not match this reconciliation. Reload the record and contact support if the problem continues.</p>
  function download() {
    setDownloadFailed(false)
    let url: string | undefined
    const anchor = document.createElement('a')
    try {
      url = URL.createObjectURL(new Blob([reportText(report!)], { type: 'text/plain;charset=utf-8' }))
      anchor.href = url
      anchor.download = `${report!.batchNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}-closeout.txt`
      document.body.append(anchor)
      anchor.click()
    } catch { setDownloadFailed(true) }
    finally { anchor.remove(); if (url) { const downloadedUrl = url; window.setTimeout(() => URL.revokeObjectURL(downloadedUrl), 1000) } }
  }
  const entries = [['Bank total', money(report.bankTotal)], ['Ledger receipts', money(report.ledgerReceiptTotal)], ['Difference', money(report.difference)], ['Period end', report.periodEnd], ['Included records', String(report.itemCount)], ['Approved', new Date(report.approvedAtUtc).toLocaleString()]]
  return <section aria-label="Closeout report" className="min-w-0 rounded-lg border bg-muted/30 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-semibold">Closeout report</h2><p className="mt-1 text-sm text-muted-foreground">Saved evidence for the approved reconciliation.</p></div><Button variant="outline" onClick={download}>Download closeout report</Button></div>
    {downloadFailed ? <p role="alert" className="mt-3 text-sm text-destructive">The report could not be downloaded. Try again.</p> : null}
    <dl className="mt-4 grid gap-4 sm:grid-cols-3">{entries.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 wrap-anywhere text-sm font-medium">{value}</dd></div>)}</dl>
    <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Approval reference</summary><p className="mt-2 wrap-anywhere">Reviewer: {report.approvedByUserId}</p><p className="mt-1 wrap-anywhere">Approval time (UTC): {report.approvedAtUtc}</p></details>
  </section>
}
