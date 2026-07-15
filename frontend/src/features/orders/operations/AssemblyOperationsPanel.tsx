import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { getOrderErrorMessage, runPlatformAction, uploadPlatformAssemblyOutput, type DataAssemblyRequest, type OrderConfiguration } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { OrderStatusBadge } from '../OrderStatusBadge'
import { CancellationDecisionPanel } from './CancellationDecisionPanel'
import { PlatformQuoteDialog } from './PlatformQuoteDialog'

type Operation = 'start' | 'decision' | 'output'

export function AssemblyOperationsPanel({ request, catalogItems, onSaved }: { request: DataAssemblyRequest; catalogItems: OrderConfiguration['catalogItems']; onSaved: () => Promise<void> }) {
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [operation, setOperation] = useState<Operation | null>(null)
  const [runId, setRunId] = useState('')
  const [profileVersion, setProfileVersion] = useState(String(request.assemblyProfileVersion))
  const [pipelineVersion, setPipelineVersion] = useState('')
  const [provenance, setProvenance] = useState('')
  const [succeeded, setSucceeded] = useState(true)
  const [qcStatusOrReason, setQcStatusOrReason] = useState('')
  const [outputFile, setOutputFile] = useState<File | null>(null)
  const [manifestJson, setManifestJson] = useState('{}')
  const [outputQcStatus, setOutputQcStatus] = useState('')
  const [uploadedCount, setUploadedCount] = useState(0)
  const activeRun = request.processingRuns.find((run) => run.id === runId) ?? request.processingRuns[0]
  const mutation = useMutation({
    mutationFn: async (input: { kind: 'start' | 'decision' | 'upload' | 'release' | 'complete' }) => {
      if (input.kind === 'start') return runPlatformAction<DataAssemblyRequest>(`data-assembly-requests/${request.id}/processing-runs`, { version: request.version, profileVersion, pipelineVersion, provenance }, true)
      if (input.kind === 'decision') {
        if (!activeRun) throw new Error('Select a processing run.')
        return runPlatformAction<DataAssemblyRequest>(`data-assembly-requests/${request.id}/processing-runs/${activeRun.id}/decision`, { version: request.version, runId: activeRun.id, succeeded, qcStatusOrReason })
      }
      if (input.kind === 'upload') {
        if (!activeRun || !outputFile) throw new Error('Select a successful processing run and output file.')
        return uploadPlatformAssemblyOutput(request.id, activeRun.id, outputFile)
      }
      if (input.kind === 'release') {
        if (!activeRun) throw new Error('Select a successful processing run.')
        return runPlatformAction<DataAssemblyRequest>(`data-assembly-requests/${request.id}/outputs/release`, { version: request.version, runId: activeRun.id, manifestJson, pipelineVersion: activeRun.pipelineVersion, provenance: activeRun.provenance, qcStatus: outputQcStatus }, true)
      }
      return runPlatformAction<DataAssemblyRequest>(`data-assembly-requests/${request.id}/complete`, { version: request.version }, true)
    },
    onSuccess: async (_data, input) => {
      await onSaved()
      if (input.kind === 'upload') { setUploadedCount((count) => count + 1); setOutputFile(null); return }
      close()
    },
  })
  function open(next: Operation, selectedRunId?: string) { mutation.reset(); setOperation(next); setRunId(selectedRunId ?? request.processingRuns[0]?.id ?? '') }
  function close() { setOperation(null); setRunId(''); setPipelineVersion(''); setProvenance(''); setQcStatusOrReason(''); setOutputFile(null); setManifestJson('{}'); setOutputQcStatus(''); setUploadedCount(0); mutation.reset() }
  const pendingRun = request.processingRuns.find((run) => !run.completedAt)
  const successfulRun = request.processingRuns.find((run) => run.completedAt && !run.failureReason)
  const mayComplete = request.status === 'OutputAvailable' && request.outputReleases.some((release) => release.releaseStatus === 'Released')
  return <div className="mt-5 space-y-5"><Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Data assembly execution</CardTitle><CardDescription>Validate the accepted input revision, record reproducible processing, review outputs, and apply the commercial release gate.</CardDescription></div><div className="flex flex-wrap gap-2">{request.status === 'QuoteInPreparation' ? <Button type="button" onClick={() => setQuoteOpen(true)}>Issue quote</Button> : null}{request.status === 'PlacedQueued' ? <Button type="button" onClick={() => open('start')}>Start processing</Button> : null}{pendingRun ? <Button type="button" variant="outline" onClick={() => open('decision', pendingRun.id)}>Complete run</Button> : null}{request.status === 'OutputReview' && successfulRun ? <Button type="button" onClick={() => open('output', successfulRun.id)}>Review outputs</Button> : null}{mayComplete ? <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ kind: 'complete' })}>Complete request</Button> : null}</div></div></CardHeader><CardContent className="space-y-4">{request.processingRuns.map((run) => <section key={run.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">Run {run.runNumber} · Pipeline {run.pipelineVersion}</p><p className="mt-1 text-sm text-muted-foreground">Profile {run.profileVersion} · Started {formatDateTime(run.startedAt)}</p></div><OrderStatusBadge status={run.failureReason ? 'Failed' : run.completedAt ? 'Succeeded' : 'Processing'} /></div>{run.qcStatus ? <p className="mt-2 text-sm">QC: {run.qcStatus}</p> : null}{run.failureReason ? <p className="mt-2 text-sm text-destructive">{run.failureReason}</p> : null}</section>)}{!request.processingRuns.length ? <p className="text-sm text-muted-foreground">No processing run has started.</p> : null}{request.outputReleases.map((release) => <section key={release.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">Output release {release.releaseVersion}</p><p className="mt-1 text-sm text-muted-foreground">Pipeline {release.pipelineVersion} · QC {release.qcStatus} · {release.files.length} file(s)</p></div><OrderStatusBadge status={release.releaseStatus} /></div></section>)}</CardContent></Card>{mutation.error && operation === null ? <Alert variant="destructive"><AlertTitle>Assembly operation failed</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Reload and try again.')}</AlertDescription></Alert> : null}<CancellationDecisionPanel workflowPath="data-assembly-requests" recordId={request.id} version={request.version} requests={request.cancellationRequests} onSaved={onSaved} /><PlatformQuoteDialog open={quoteOpen} workflow="assembly" recordId={request.id} version={request.version} catalogItems={catalogItems} onOpenChange={setQuoteOpen} onSaved={onSaved} />
    <Dialog open={operation !== null} onOpenChange={(openState) => !openState && close()}><DialogContent><DialogHeader><DialogTitle>{operation === 'start' ? 'Start processing run' : operation === 'decision' ? 'Complete processing run' : 'Review assembly outputs'}</DialogTitle><DialogDescription>Record the exact profile, pipeline, provenance, QC, and immutable output facts used for this request.</DialogDescription></DialogHeader>{operation === 'start' ? <><div><Label htmlFor="assemblyRunProfile">Profile version *</Label><Input id="assemblyRunProfile" className="mt-2" value={profileVersion} onChange={(event) => setProfileVersion(event.target.value)} /></div><div><Label htmlFor="assemblyRunPipeline">Pipeline version *</Label><Input id="assemblyRunPipeline" className="mt-2" value={pipelineVersion} onChange={(event) => setPipelineVersion(event.target.value)} /></div><div><Label htmlFor="assemblyRunProvenance">Provenance *</Label><textarea id="assemblyRunProvenance" value={provenance} onChange={(event) => setProvenance(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div></> : null}{operation === 'decision' ? <><div><Label htmlFor="assemblyRunOutcome">Outcome *</Label><select id="assemblyRunOutcome" value={succeeded ? 'success' : 'failure'} onChange={(event) => setSucceeded(event.target.value === 'success')} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="success">Succeeded</option><option value="failure">Failed</option></select></div><div><Label htmlFor="assemblyRunQc">{succeeded ? 'QC status' : 'Failure reason'} *</Label><textarea id="assemblyRunQc" value={qcStatusOrReason} onChange={(event) => setQcStatusOrReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div></> : null}{operation === 'output' ? <><div><Label htmlFor="assemblyOutputFile">Output file</Label><div className="mt-2 flex gap-2"><Input id="assemblyOutputFile" type="file" onChange={(event) => setOutputFile(event.target.files?.[0] ?? null)} /><Button type="button" variant="outline" disabled={!outputFile || mutation.isPending} onClick={() => mutation.mutate({ kind: 'upload' })}>Upload</Button></div>{uploadedCount ? <p className="mt-1 text-sm text-muted-foreground">{uploadedCount} output file(s) uploaded in this review.</p> : null}</div><div><Label htmlFor="assemblyOutputManifest">Output manifest (JSON) *</Label><textarea id="assemblyOutputManifest" value={manifestJson} onChange={(event) => setManifestJson(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm" /></div><div><Label htmlFor="assemblyOutputQc">QC status *</Label><Input id="assemblyOutputQc" className="mt-2" value={outputQcStatus} onChange={(event) => setOutputQcStatus(event.target.value)} /></div></> : null}{mutation.error ? <Alert variant="destructive"><AlertTitle>Operation was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the operation and try again.')}</AlertDescription></Alert> : null}<DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>{operation === 'start' ? <Button type="button" disabled={!profileVersion.trim() || !pipelineVersion.trim() || !provenance.trim() || mutation.isPending} onClick={() => mutation.mutate({ kind: 'start' })}>Start run</Button> : null}{operation === 'decision' ? <Button type="button" disabled={!qcStatusOrReason.trim() || mutation.isPending} onClick={() => mutation.mutate({ kind: 'decision' })}>Save outcome</Button> : null}{operation === 'output' ? <Button type="button" disabled={!isJson(manifestJson) || !outputQcStatus.trim() || mutation.isPending} onClick={() => mutation.mutate({ kind: 'release' })}>Approve output and invoice</Button> : null}</DialogFooter></DialogContent></Dialog>
  </div>
}

function isJson(value: string) { try { JSON.parse(value); return true } catch { return false } }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
