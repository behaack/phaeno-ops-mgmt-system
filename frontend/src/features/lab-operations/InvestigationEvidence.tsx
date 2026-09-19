import type { EvidenceRow } from '#/api/lab-investigation'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { useState } from 'react'

export const evidenceLabel = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())
export const evidenceDate = (value: unknown) => value ? new Date(String(value)).toLocaleString() : 'Not recorded'
export function EvidenceDetails({ value }: { value: unknown }) {
  if (value == null) return <span className="text-muted-foreground">Not recorded</span>
  if (Array.isArray(value)) return <ol className="space-y-2">{value.map((item, index) => <li key={index}><EvidenceDetails value={item} /></li>)}</ol>
  if (typeof value === 'object') return <dl className="space-y-2">{Object.entries(value).map(([key, item]) => <div key={key} className="min-w-0"><dt className="font-medium">{evidenceLabel(key)}</dt><dd className="break-words pl-3"><EvidenceDetails value={item} /></dd></div>)}</dl>
  if (typeof value === 'string' && /^[{[]/.test(value)) {
    try { return <EvidenceDetails value={JSON.parse(value)} /> } catch { /* Preserve unstructured historical text. */ }
  }
  return <span className="whitespace-pre-wrap break-all">{String(value)}</span>
}
export function EvidenceList({ title, rows }: { title: string; rows: EvidenceRow[] }) {
  const [page, setPage] = useState(0)
  return <details className="rounded-lg border"><summary className="cursor-pointer bg-muted/50 p-3 text-sm font-medium">{title} ({rows.length})</summary><div className="space-y-3 p-3 text-sm">{rows.slice(page * 10, page * 10 + 10).map((row, index) => <details key={row.id ?? index} className="rounded-md border p-3"><summary className="cursor-pointer break-words">{String(row.fileName ?? row.libraryKey ?? row.providerRunReference ?? row.runReference ?? row.eventCode ?? row.title ?? row.barcode ?? row.id ?? 'Recorded evidence')}</summary><div className="mt-3"><EvidenceDetails value={row} /></div></details>)}{!rows.length ? <p>No records in this section.</p> : null}{rows.length > 10 ? <EvidencePages page={page} next={rows.length > (page + 1) * 10} onChange={setPage} /> : null}</div></details>
}
export function EvidencePages({ page, next, onChange }: { page: number; next: boolean; onChange: (page: number) => void }) {
  return <div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</Button><span className="text-sm">Page {page + 1}</span><Button size="sm" variant="outline" disabled={!next} onClick={() => onChange(page + 1)}>Next</Button></div>
}
export function EvidenceError({ error }: { error: unknown }) {
  return <Alert variant="destructive"><AlertTitle>Evidence unavailable</AlertTitle><AlertDescription>{getLabOperationsError(error, 'This source could not be loaded. Reload before using this view for an investigation.')}</AlertDescription></Alert>
}
