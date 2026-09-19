import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { relatedInvestigationSamples } from '#/api/lab-investigation'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { EvidenceError, EvidencePages } from './InvestigationEvidence'

export function RelatedInvestigationSamples({ workOrderId }: { workOrderId: string }) {
  const id = useId()
  const [kind, setKind] = useState('tube')
  const [reference, setReference] = useState('')
  const [search, setSearch] = useState<{ kind: string; reference: string; page: number } | null>(null)
  const query = useQuery({ queryKey: ['related-samples', workOrderId, search], queryFn: () => relatedInvestigationSamples(workOrderId, search!.kind, search!.reference, search!.page), enabled: Boolean(search) })
  return <details className="rounded-lg border"><summary className="cursor-pointer bg-muted/50 p-3 text-sm font-medium">Find related samples</summary><div className="space-y-3 p-3">
    <p className="text-xs text-muted-foreground">Search an exact reference within this job’s organization. Matches show shared recorded resources, not proof of a shared cause.</p>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (reference.trim()) setSearch({ kind, reference: reference.trim(), page: 0 }) }}>
      <div><Label htmlFor={`${id}-kind`}>Reference type</Label><select id={`${id}-kind`} value={kind} onChange={event => setKind(event.target.value)} className="mt-1 h-9 cursor-pointer rounded-lg border bg-background px-3 text-sm">{Object.entries({ tube: 'Tube barcode', lot: 'Material lot number', equipment: 'Equipment asset code', 'sequencing-run': 'Sequencing run', library: 'Library key', 'preparation-batch': 'Preparation tray barcode' }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="min-w-0 flex-1"><Label htmlFor={`${id}-ref`}>Exact reference</Label><Input id={`${id}-ref`} className="mt-1" value={reference} maxLength={255} onChange={event => setReference(event.target.value)} /></div><Button type="submit" variant="outline" disabled={!reference.trim()}>Find samples</Button>
    </form>
    {search ? query.isPending ? <p role="status">Finding related samples…</p> : query.isError ? <EvidenceError error={query.error} /> : <><p className="text-xs">Matches for {search.reference}</p>{query.data?.slice(0, 25).map(sample => <p key={sample.id}><Link className="text-sm text-primary underline" to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId: sample.labWorkOrderId, specimenId: sample.id }} search={{ section: 'jobs' }}>{sample.accessionNumber ?? `Sample ${sample.id}`}</Link></p>)}{!query.data?.length ? <p className="text-sm">No matching samples in this organization.</p> : null}{search.page > 0 || (query.data?.length ?? 0) > 25 ? <EvidencePages page={search.page} next={(query.data?.length ?? 0) > 25} onChange={page => setSearch({ ...search, page })} /> : null}</> : null}
  </div></details>
}
