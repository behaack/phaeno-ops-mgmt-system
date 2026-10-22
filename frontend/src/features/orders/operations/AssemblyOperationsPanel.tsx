import { LoadingState } from '#/components/ui/content-state'
import { formatDisplayTimestamp } from '#/lib/display-format'
import { Field as PortalField } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { KitLotSubmissionSummary } from '../KitLotSubmission'
import { ActionMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { getLabAssemblyOutputs, runLabManufacturingAction, uploadLabAssemblyOutput } from '#/api/lab-operations'
import { getOrderErrorMessage, type DataAssemblyRequest } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter as DialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { OrderStatusBadge } from '../OrderStatusBadge'

type Operation = 'start' | 'decision' | 'output'

export function AssemblyOperationsPanel({ request, onSaved }: { request: DataAssemblyRequest; onSaved: () => Promise<void> }) {
  const [operation, setOperation] = useState<Operation | null>(null)
  const [runId, setRunId] = useState('')
  const profileVersion = String(request.assemblyProfileVersion)
  const [pipelineVersion, setPipelineVersion] = useState('')
  const [provenance, setProvenance] = useState('')
  const [succeeded, setSucceeded] = useState(true)
  const [qcStatusOrReason, setQcStatusOrReason] = useState('')
  const [outputFile, setOutputFile] = useState<File | null>(null)
  const [outputQcStatus, setOutputQcStatus] = useState('')
  const cache = useQueryClient()
  const activeRun = request.processingRuns.find((run) => run.id === runId) ?? request.processingRuns[0]
  const outputs = useQuery({ queryKey: ['assembly-run-outputs', request.id, activeRun?.id], queryFn: () => getLabAssemblyOutputs(request.id, activeRun!.id), enabled: operation === 'output' && Boolean(activeRun) })
  const mutation = useMutation({
    mutationFn: async (input: { kind: 'start' | 'decision' | 'upload' | 'release' | 'complete' }) => {
      if (input.kind === 'start') return runLabManufacturingAction<DataAssemblyRequest>('assembly', `${request.id}/processing-runs`, { version: request.version, profileVersion, pipelineVersion, provenance, kitLotVersion: request.kitLotSubmission?.currentAssessment.lotVersion }, true)
      if (input.kind === 'decision') {
        if (!activeRun) throw new Error('Select a processing run.')
        return runLabManufacturingAction<DataAssemblyRequest>('assembly', `${request.id}/processing-runs/${activeRun.id}/decision`, { version: request.version, runId: activeRun.id, succeeded, qcStatusOrReason })
      }
      if (input.kind === 'upload') {
        if (!activeRun || !outputFile) throw new Error('Select a successful processing run and output file.')
        return uploadLabAssemblyOutput(request.id, activeRun.id, outputFile)
      }
      if (input.kind === 'release') {
        if (!activeRun) throw new Error('Select a successful processing run.')
        return runLabManufacturingAction<DataAssemblyRequest>('assembly', `${request.id}/outputs/release`, { version: request.version, runId: activeRun.id, manifestJson: '{}', pipelineVersion: activeRun.pipelineVersion, provenance: activeRun.provenance, qcStatus: outputQcStatus }, true)
      }
      return runLabManufacturingAction<DataAssemblyRequest>('assembly', `${request.id}/complete`, { version: request.version }, true)
    },
    onSuccess: async (_data, input) => {
      await onSaved()
      if (input.kind === 'upload') { await cache.invalidateQueries({ queryKey: ['assembly-run-outputs', request.id, activeRun?.id] }); setOutputFile(null); return }
      close()
    },
  })
  function open(next: Operation, selectedRunId?: string) { mutation.reset(); setOperation(next); setRunId(selectedRunId ?? request.processingRuns[0]?.id ?? '') }
  function close() { setOperation(null); setRunId(''); setPipelineVersion(''); setProvenance(''); setQcStatusOrReason(''); setOutputFile(null); setOutputQcStatus(''); mutation.reset() }
  const pendingRun = request.processingRuns.find((run) => !run.completedAt)
  const successfulRun = request.processingRuns.find((run) => run.completedAt && !run.failureReason)
  const mayComplete = request.status === 'OutputAvailable' && request.outputReleases.some((release) => release.releaseStatus === 'Released')
  return <div className="mt-5 space-y-5">{request.isIncludedAssembly ? <Card><CardHeader><CardTitle>Kit lot check before analysis</CardTitle><CardDescription>Review the entered lot and actual kit-use date first. Starting a run checks the current lot status again.</CardDescription></CardHeader><CardContent><KitLotSubmissionSummary submission={request.kitLotSubmission} /></CardContent></Card> : null}<Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle><CustomerSourceText source={"Data assembly execution"} /></CardTitle><CardDescription><CustomerSourceText source={"Validate accepted input, record reproducible processing, review quality, and approve manufacturing outputs. Commercial billing and Customer release gates follow automatically."} /></CardDescription></div><ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end">{request.status === 'PlacedQueued' ? <DropdownMenuItem onSelect={() => open('start')}><CustomerSourceText source={"Start processing"} /></DropdownMenuItem> : null}{pendingRun ? <DropdownMenuItem onSelect={() => open('decision', pendingRun.id)}><CustomerSourceText source={"Complete run"} /></DropdownMenuItem> : null}{request.status === 'OutputReview' && successfulRun ? <DropdownMenuItem onSelect={() => open('output', successfulRun.id)}><CustomerSourceText source={"Review outputs"} /></DropdownMenuItem> : null}{mayComplete ? <DropdownMenuItem disabled={mutation.isPending} onSelect={() => mutation.mutate({ kind: 'complete' })}><CustomerSourceText source={"Complete manufacturing"} /></DropdownMenuItem> : null}</DropdownMenuContent></ActionMenu></div></CardHeader><CardContent className="space-y-4">{request.processingRuns.map((run) => <section key={run.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium"><CustomerSourceText source={"Run"} /> {run.runNumber} <CustomerSourceText source={"Â· Pipeline"} /> {run.pipelineVersion}</p><p className="mt-1 text-sm text-muted-foreground"><CustomerSourceText source={"Profile"} /> {run.profileVersion} <CustomerSourceText source={"Â· Started"} /> {formatDateTime(run.startedAt)}</p></div><OrderStatusBadge status={run.failureReason ? 'Failed' : run.completedAt ? 'Succeeded' : 'Processing'} /></div>{run.qcStatus ? <p className="mt-2 text-sm">QC: {run.qcStatus}</p> : null}{run.failureReason ? <p className="mt-2 text-sm text-destructive">{run.failureReason}</p> : null}</section>)}{!request.processingRuns.length ? <p className="text-sm text-muted-foreground"><CustomerSourceText source={"No processing run has started."} /></p> : null}{request.outputReleases.map((release) => <section key={release.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium"><CustomerSourceText source={"Output release"} /> {release.releaseVersion}</p><p className="mt-1 text-sm text-muted-foreground"><CustomerSourceText source={"Pipeline"} /> {release.pipelineVersion} Â· QC {release.qcStatus} Â· {release.files.length} <CustomerSourceText source={"file(s)"} /></p></div><OrderStatusBadge status={release.releaseStatus} /></div></section>)}</CardContent></Card>{mutation.error && operation === null ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Assembly operation failed"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Reload and try again.')} />}</AlertDescription></Alert> : null}
    <Dialog open={operation !== null} onOpenChange={(openState) => !openState && close()}><DialogContent><DialogHeader><DialogTitle>{operation === 'start' ? <CustomerSourceText source={"Start processing run"} /> : operation === 'decision' ? 'Complete processing run' : 'Review assembly outputs'}</DialogTitle><DialogDescription><CustomerSourceText source={"Record the exact profile, pipeline, provenance, QC, and immutable output facts used for this request."} /></DialogDescription></DialogHeader>{operation === 'start' ? <>{request.isIncludedAssembly ? <KitLotSubmissionSummary submission={request.kitLotSubmission} /> : null}<PortalField><Label htmlFor="assemblyRunProfile"><RequiredFieldName><CustomerSourceText source={"Profile version"} /></RequiredFieldName></Label><Input id="assemblyRunProfile"  value={profileVersion} readOnly /></PortalField><PortalField><Label htmlFor="assemblyRunPipeline"><RequiredFieldName><CustomerSourceText source={"Pipeline version"} /></RequiredFieldName></Label><Input id="assemblyRunPipeline"  value={pipelineVersion} onChange={(event) => setPipelineVersion(event.target.value)} /></PortalField><div><Label htmlFor="assemblyRunProvenance"><RequiredFieldName><CustomerSourceText source={"Provenance"} /></RequiredFieldName></Label><textarea id="assemblyRunProvenance" value={provenance} onChange={(event) => setProvenance(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div></> : null}{operation === 'decision' ? <><PortalField><Label htmlFor="assemblyRunOutcome"><RequiredFieldName><CustomerSourceText source={"Outcome"} /></RequiredFieldName></Label><NativeSelect id="assemblyRunOutcome" value={succeeded ? 'success' : 'failure'} onChange={(event) => setSucceeded(event.target.value === 'success')} className="w-full"><option value="success"><CustomerSourceText source={"Succeeded"} /></option><option value="failure"><CustomerSourceText source={"Failed"} /></option></NativeSelect></PortalField><div><Label htmlFor="assemblyRunQc"><RequiredFieldName>{succeeded ? <CustomerSourceText source={"QC status"} /> : <CustomerSourceText source={"Failure reason"} />}</RequiredFieldName></Label><textarea id="assemblyRunQc" value={qcStatusOrReason} onChange={(event) => setQcStatusOrReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div></> : null}{operation === 'output' ? <><div><Label htmlFor="assemblyOutputFile"><CustomerSourceText source={"Output file"} /></Label><div className="mt-2 flex gap-2"><Input id="assemblyOutputFile" type="file" onChange={(event) => setOutputFile(event.target.files?.[0] ?? null)} /><Button type="button" variant="outline" disabled={!outputFile || mutation.isPending} onClick={() => mutation.mutate({ kind: 'upload' })}><CustomerSourceText source={"Upload"} /></Button></div>{outputs.isLoading ? <LoadingState  label={<><CustomerSourceText source={"Loading uploaded outputsâ€¦"} /></>} /> : outputs.error ? <p role="alert" className="text-sm text-destructive"><CustomerSourceText source={"Output files could not be loaded. Close and reopen the review."} /></p> : <ul className="mt-3 divide-y text-sm">{outputs.data?.map(file => <li key={file.id} className="py-2">{file.fileName} Â· {file.scanStatus}</li>)}</ul>}</div><p className="text-sm text-muted-foreground"><CustomerSourceText source={"POMS creates the immutable manifest from these uploaded files and the selected processing run. All files must pass scanning before approval."} /></p><PortalField><Label htmlFor="assemblyOutputQc"><RequiredFieldName><CustomerSourceText source={"QC status"} /></RequiredFieldName></Label><Input id="assemblyOutputQc"  value={outputQcStatus} onChange={(event) => setOutputQcStatus(event.target.value)} /></PortalField></> : null}{mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Operation was not saved"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Review the operation and try again.')} />}{operation === 'start' ? <Button type="button" variant="outline" onClick={() => void onSaved()}>Refresh lot information</Button> : null}</AlertDescription></Alert> : null}<DialogFooter><DialogClose asChild><Button type="button" variant="outline"><CustomerSourceText source={"Cancel"} /></Button></DialogClose>{operation === 'start' ? <Button type="button" disabled={!profileVersion.trim() || !pipelineVersion.trim() || !provenance.trim() || mutation.isPending || (request.isIncludedAssembly && !request.kitLotSubmission?.usedOn) || request.status !== 'PlacedQueued'} onClick={() => mutation.mutate({ kind: 'start' })}><CustomerSourceText source={"Start run"} /></Button> : null}{operation === 'decision' ? <Button type="button" disabled={!qcStatusOrReason.trim() || mutation.isPending} onClick={() => mutation.mutate({ kind: 'decision' })}><CustomerSourceText source={"Save outcome"} /></Button> : null}{operation === 'output' ? <Button type="button" disabled={!outputs.data?.length || outputs.data.some(file => file.scanStatus !== 'Clean') || !outputQcStatus.trim() || mutation.isPending} onClick={() => mutation.mutate({ kind: 'release' })}><CustomerSourceText source={"Approve output"} /></Button> : null}</DialogFooter></DialogContent></Dialog>
  </div>
}

function formatDateTime(value: string) { return formatDisplayTimestamp(value) }
