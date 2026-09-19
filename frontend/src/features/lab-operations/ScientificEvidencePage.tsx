import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { getScientificWorkspace, scientificKey, type ScientificWorkspace } from '#/api/lab-scientific-evidence'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { EvidenceDetails, EvidenceError, EvidencePages, evidenceDate } from './InvestigationEvidence'
import { ScientificCaptureForm } from './ScientificCaptureForm'
import { ManualResultDialog } from './ManualResultDialog'

const recordRoute = '/lab-operations/$workOrderId/specimens/$specimenId/evidence/$kind/$recordId' as const
function readableMetadata(value: unknown, data: ScientificWorkspace): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => key !== 'schemaVersion' && item != null && (!Array.isArray(item) || item.length > 0)).map(([key, item]) => {
    if (key.endsWith('AtUtc') && typeof item === 'string') return [key.replace('AtUtc', ''), evidenceDate(item)]
    if (key === 'inputRoles' && Array.isArray(item)) return [key, item.map((input: { sequencingOutputId: string; role: string }) => ({ input: data.outputs.find(o => o.id === input.sequencingOutputId)?.externalFileReference ?? input.sequencingOutputId, role: input.role }))]
    return [key, item]
  }))
}
export function ScientificEvidenceList({ workOrderId, specimenId }: { workOrderId: string; specimenId: string }) {
  const query = useQuery({ queryKey: scientificKey(workOrderId, specimenId), queryFn: () => getScientificWorkspace(workOrderId, specimenId) })
  if (query.isPending) return <p role="status">Loading scientific records…</p>
  if (query.isError) return <div className="space-y-2"><EvidenceError error={query.error} /><Button variant="outline" onClick={() => void query.refetch()}>Reload scientific records</Button></div>
  return <>{(['sequencing', 'analysis'] as const).map(kind => <ScientificRecordList key={kind} kind={kind} data={query.data} />)}</>
}
function ScientificRecordList({ kind, data }: { kind: 'sequencing' | 'analysis'; data: ScientificWorkspace }) {
  const [page, setPage] = useState(0)
  const rows = kind === 'sequencing' ? data.outputs : data.analyses
  const params = { workOrderId: data.workOrderId, specimenId: data.specimenId, kind }
  return <section className="overflow-hidden rounded-lg border" aria-label={kind === 'sequencing' ? 'Sequencing records' : 'Analysis records'}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/50 p-3"><h3 className="text-sm font-medium">{kind === 'sequencing' ? 'Sequencing outputs' : 'Analysis runs'} ({rows.length})</h3>{data.canRecord ? <Button size="sm" variant="outline" asChild><Link to={recordRoute} params={{ ...params, recordId: 'new' }}>Record {kind === 'sequencing' ? 'sequencing output' : 'analysis run'}</Link></Button> : null}</header>
    <div className="space-y-3 p-3 text-sm">{rows.slice(page * 10, page * 10 + 10).map(row => <div key={row.id} className="min-w-0 border-b pb-2"><Link className="break-all text-primary underline" to={recordRoute} params={{ ...params, recordId: row.id }}>{'externalFileReference' in row ? `${row.externalFileReference} · ${row.providerRunReference}` : row.runReference}</Link><p className="text-xs text-muted-foreground">{row.providerKey} · Recorded {evidenceDate(row.recordedAtUtc)}</p></div>)}{!rows.length ? <p>No records yet.</p> : null}{rows.length > 10 ? <EvidencePages page={page} next={rows.length > (page + 1) * 10} onChange={setPage} /> : null}</div>
  </section>
}
export function ScientificEvidencePage({ workOrderId, specimenId, kind, recordId, from }: { workOrderId: string; specimenId: string; kind: string; recordId: string; from?: string }) {
  const query = useQuery({ queryKey: scientificKey(workOrderId, specimenId), queryFn: () => getScientificWorkspace(workOrderId, specimenId) })
  const navigate = useNavigate()
  const [upload, setUpload] = useState(false)
  const back = () => void navigate({ to: '/lab-operations/$workOrderId/specimens/$specimenId', params: { workOrderId, specimenId } })
  if (query.isPending) return <p role="status">Loading scientific evidence…</p>
  if (query.isError) return <div className="space-y-3 p-6"><EvidenceError error={query.error} /><Button variant="outline" onClick={() => void query.refetch()}>Reload scientific records</Button></div>
  if (kind !== 'sequencing' && kind !== 'analysis') return <EvidenceError error={new Error('This scientific record type is not supported.')} />
  const data = query.data
  const rows = kind === 'sequencing' ? data.outputs : data.analyses
  const row = rows.find(r => r.id === (recordId === 'new' ? from : recordId))
  if ((recordId !== 'new' || from) && !row) return <EvidenceError error={new Error('This record was not found for this sample. Reload its history before continuing.')} />
  const title = kind === 'sequencing' ? 'Sequencing output' : 'Analysis run'
  const params = { workOrderId, specimenId, kind }
  let metadata: unknown
  try { metadata = row?.scientificEvidenceJson ? JSON.parse(row.scientificEvidenceJson) : null } catch { return <EvidenceError error={new Error('The saved scientific metadata could not be read. Investigate the original record before creating a replacement.')} /> }
  const replace = () => void navigate({ to: recordRoute, params: { ...params, recordId: 'new' }, search: { from: row!.id } })
  return <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
    <Link className="text-sm text-primary underline" to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId, specimenId }}>Back to sample {data.accessionNumber ?? ''}</Link>
    <h1 className="text-2xl font-semibold">{recordId === 'new' ? from ? kind === 'sequencing' ? 'Record sequencing correction' : 'Record reanalysis' : `Record ${title.toLowerCase()}` : title}</h1>
    {recordId === 'new' ? data.canRecord ? <ScientificCaptureForm key={`${kind}-${from ?? 'new'}`} kind={kind} data={data} source={row} cancel={back} saved={id => void navigate({ to: recordRoute, params: { ...params, recordId: id }, search: {} })} /> : <p>Scientific capture is unavailable for your role or the current job state.</p> : row ? <>
      <Card className="gap-0 overflow-hidden py-0"><CardHeader className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/50 p-4"><div className="min-w-0"><CardTitle className="break-all">{'providerRunReference' in row ? row.providerRunReference : row.runReference}</CardTitle><p className="mt-1 text-sm">{row.providerKey} · Recorded {evidenceDate(row.recordedAtUtc)}</p></div>{data.canRecord && kind === 'analysis' && data.canManualUpload ? <ActionMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions<ChevronDown className="size-4" aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={replace}>Record reanalysis</DropdownMenuItem><DropdownMenuItem onSelect={() => setUpload(true)}>Upload result</DropdownMenuItem></DropdownMenuContent></ActionMenu> : data.canRecord ? <Button variant="outline" onClick={replace}>{kind === 'sequencing' ? 'Record correction' : 'Record reanalysis'}</Button> : kind === 'analysis' && data.canManualUpload ? <Button variant="outline" onClick={() => setUpload(true)}>Upload result</Button> : null}</CardHeader>
        <CardContent className="space-y-4 p-4 text-sm"><p>Recorded evidence remains unchanged. A correction or reanalysis creates a new linked record.</p>
          {'labLibraryId' in row ? <EvidenceDetails value={{ library: data.libraries.find(l => l.id === row.labLibraryId)?.libraryKey ?? row.labLibraryId, libraryTube: data.libraries.find(l => l.id === row.labLibraryId)?.barcode, sampleMapping: row.sampleMappingReference, externalFile: row.externalFileReference, sha256: row.sha256, sizeBytes: row.sizeBytes, correctionReason: row.correctionReason }} /> : <><h2 className="font-medium">Exact sequencing inputs</h2>{data.inputs.filter(i => i.labAnalysisRunId === row.id).map(i => <p key={i.labSequencingOutputId}><Link className="break-all text-primary underline" to={recordRoute} params={{ ...params, kind: 'sequencing', recordId: i.labSequencingOutputId }}>{data.outputs.find(o => o.id === i.labSequencingOutputId)?.externalFileReference ?? i.labSequencingOutputId}</Link></p>)}{row.reanalysisReason ? <p>Reanalysis reason: {row.reanalysisReason}</p> : null}<p>{row.requirementsSnapshotJson ? 'Scientific requirements were pinned when this run was recorded.' : 'Legacy record: no scientific requirements profile was pinned.'}</p></>}
          {('correctsOutputId' in row ? row.correctsOutputId : row.previousAnalysisRunId) ? <Link className="text-primary underline" to={recordRoute} params={{ ...params, recordId: ('correctsOutputId' in row ? row.correctsOutputId : row.previousAnalysisRunId)! }}>View preceding record</Link> : null}
          <h2 className="font-medium">Scientific metadata</h2><EvidenceDetails value={readableMetadata(metadata, data)} />
        </CardContent></Card>
      {upload && kind === 'analysis' && data.canManualUpload ? <ManualResultDialog data={data} analysisId={row.id} close={() => setUpload(false)} /> : null}
    </> : null}
  </main>
}
