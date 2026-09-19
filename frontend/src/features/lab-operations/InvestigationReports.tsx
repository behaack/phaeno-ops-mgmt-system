import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useRef, useState } from 'react'
import { downloadInvestigationReport, generateInvestigationReport, getInvestigationReports } from '#/api/lab-investigation'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { EvidenceError, EvidencePages, evidenceDate } from './InvestigationEvidence'

export function InvestigationReports({ workOrderId, specimenId, canGenerate }: { workOrderId: string; specimenId: string; canGenerate: boolean }) {
  const client = useQueryClient()
  const [page, setPage] = useState(0)
  const requestId = useRef<string | null>(null)
  const key = ['investigation-reports', workOrderId, specimenId]
  const reports = useQuery({ queryKey: [...key, page], queryFn: () => getInvestigationReports(workOrderId, specimenId, page) })
  const generation = useMutation({ mutationFn: () => {
    requestId.current ??= crypto.randomUUID()
    return generateInvestigationReport(workOrderId, specimenId, requestId.current)
  }, onSuccess: async () => { requestId.current = null; setPage(0); await client.invalidateQueries({ queryKey: key }) } })
  const download = useMutation({ mutationFn: async ({ id, format }: { id: string; format: 'json' | 'html' }) => {
    const blob = await downloadInvestigationReport(workOrderId, specimenId, id, format)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = `sample-investigation-${id}.${format}`
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } })
  return <section aria-label="Saved investigation reports" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">Saved investigation reports</h3><Button size="sm" disabled={!canGenerate || generation.isPending} onClick={() => generation.mutate()}>{generation.isPending ? 'Saving…' : 'Save investigation report'}</Button></div>
    <p className="text-xs text-muted-foreground">Reports preserve the evidence available when generated. Open the readable report to print it. The manifest includes the structured evidence. Customer download expiry does not remove these records.</p>
    {generation.isSuccess ? <p role="status" className="text-sm">Investigation report saved.</p> : null}
    {generation.isError ? <EvidenceError error={generation.error} /> : null}{download.isError ? <EvidenceError error={download.error} /> : null}
    {reports.isError ? <EvidenceError error={reports.error} /> : reports.isPending ? <p role="status">Loading reports…</p> : <>
      {reports.data.slice(0, 25).map(report => <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="text-sm">{evidenceDate(report.generatedAtUtc)}</p><p className="break-all text-xs text-muted-foreground">SHA-256: {report.sha256}</p></div><ActionMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline" disabled={download.isPending}>Actions <ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => download.mutate({ id: report.id, format: 'html' })}>Download readable report</DropdownMenuItem><DropdownMenuItem onSelect={() => download.mutate({ id: report.id, format: 'json' })}>Download evidence manifest</DropdownMenuItem></DropdownMenuContent></ActionMenu></div>)}
      {!reports.data.length ? <p className="text-sm text-muted-foreground">No saved reports.</p> : null}{page > 0 || reports.data.length > 25 ? <EvidencePages page={page} next={reports.data.length > 25} onChange={setPage} /> : null}
    </>}
  </section>
}
