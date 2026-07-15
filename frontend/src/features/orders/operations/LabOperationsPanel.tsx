import { useMutation } from '@tanstack/react-query'
import { FileUp } from 'lucide-react'
import { useState } from 'react'

import { accessionPlatformLabSample, getOrderErrorMessage, receivePlatformLabSample, releasePlatformLabResult, runPlatformAction, transitionPlatformLabSample, uploadPlatformLabResult, type LabSample, type LabServiceOrder, type OrderConfiguration } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { OrderStatusBadge } from '../OrderStatusBadge'
import { CancellationDecisionPanel } from './CancellationDecisionPanel'
import { PlatformQuoteDialog } from './PlatformQuoteDialog'

type SampleAction = 'receive' | 'accession' | 'transition' | 'upload'

export function LabOperationsPanel({ order, catalogItems, onSaved }: { order: LabServiceOrder; catalogItems: OrderConfiguration['catalogItems']; onSaved: () => Promise<void> }) {
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [sampleAction, setSampleAction] = useState<{ kind: SampleAction; sample: LabSample } | null>(null)
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 16))
  const [receiptCondition, setReceiptCondition] = useState('')
  const [accessionId, setAccessionId] = useState('')
  const [targetStatus, setTargetStatus] = useState('')
  const [tenantReason, setTenantReason] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [resultFile, setResultFile] = useState<File | null>(null)
  const [analysisProfile, setAnalysisProfile] = useState('')
  const [pipelineVersion, setPipelineVersion] = useState('')
  const [provenance, setProvenance] = useState('')
  const [qcStatus, setQcStatus] = useState('')

  const mutation = useMutation({
    mutationFn: async (input: { kind: 'sample' } | { kind: 'release'; sampleId: string; releaseId: string } | { kind: 'complete' }) => {
      if (input.kind === 'release') return releasePlatformLabResult(order.id, input.sampleId, input.releaseId, order.version)
      if (input.kind === 'complete') return runPlatformAction<LabServiceOrder>(`lab-service-orders/${order.id}/complete`, { version: order.version }, true)
      if (!sampleAction) throw new Error('Select a sample action.')
      const { sample, kind } = sampleAction
      if (kind === 'receive') return receivePlatformLabSample(order.id, sample.id, { version: sample.version, receivedAt: new Date(receivedAt).toISOString(), receiptCondition })
      if (kind === 'accession') return accessionPlatformLabSample(order.id, sample.id, { version: sample.version, accessionId })
      if (kind === 'transition') return transitionPlatformLabSample(order.id, sample.id, { version: sample.version, status: targetStatus, reason: tenantReason || null, internalNote: internalNote || null })
      if (!resultFile) throw new Error('Select a result file.')
      return uploadPlatformLabResult(order.id, sample.id, { file: resultFile, analysisProfile, pipelineVersion, provenance, qcStatus })
    },
    onSuccess: async () => { await onSaved(); closeSampleDialog() },
  })

  function openSampleAction(kind: SampleAction, sample: LabSample) {
    mutation.reset()
    setSampleAction({ kind, sample })
    setTargetStatus(nextSampleStatus(sample.status))
  }

  function closeSampleDialog() {
    setSampleAction(null)
    setReceiptCondition('')
    setAccessionId('')
    setTargetStatus('')
    setTenantReason('')
    setInternalNote('')
    setResultFile(null)
    setAnalysisProfile('')
    setPipelineVersion('')
    setProvenance('')
    setQcStatus('')
    mutation.reset()
  }

  const canIssueQuote = order.status === 'QuoteInPreparation'
  const canComplete = order.status === 'InProgress' || order.status === 'ResultsAvailable'
  return <div className="mt-5 space-y-5"><Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Laboratory execution</CardTitle><CardDescription>Receive, accession, process, review, and release each sample independently.</CardDescription></div><div className="flex gap-2">{canIssueQuote ? <Button type="button" onClick={() => setQuoteOpen(true)}>Issue quote</Button> : null}{canComplete ? <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ kind: 'complete' })}>Complete job</Button> : null}</div></div></CardHeader><CardContent className="space-y-4">{order.samples.map((sample) => <section key={sample.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{sample.customerSampleId}</h3><p className="mt-1 text-sm text-muted-foreground">{sample.materialType} · {sample.quantity} {sample.quantityUnit}{sample.accessionId ? ` · Accession ${sample.accessionId}` : ''}</p></div><OrderStatusBadge status={sample.status} /></div><div className="mt-4 flex flex-wrap gap-2">{sample.status === 'Expected' ? <Button type="button" size="sm" onClick={() => openSampleAction('receive', sample)}>Record receipt</Button> : null}{sample.status === 'Received' ? <Button type="button" size="sm" onClick={() => openSampleAction('accession', sample)}>Assign accession</Button> : null}{!['Expected', 'Received', 'Completed', 'Rejected'].includes(sample.status) ? <Button type="button" size="sm" variant="outline" onClick={() => openSampleAction('transition', sample)}>Change stage</Button> : null}{['DataProcessing', 'DataAvailable'].includes(sample.status) ? <Button type="button" size="sm" variant="outline" onClick={() => openSampleAction('upload', sample)}><FileUp data-icon="inline-start" />Upload result</Button> : null}</div>{order.resultReleases.filter((release) => release.labSampleId === sample.id).map((release) => <div key={release.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div><p className="text-sm font-medium">Result release {release.releaseVersion} · {release.analysisProfile}</p><p className="mt-1 text-xs text-muted-foreground">Pipeline {release.pipelineVersion} · QC {release.qcStatus}</p></div><div className="flex items-center gap-2"><OrderStatusBadge status={release.releaseStatus} />{release.releaseStatus === 'Internal' ? <Button type="button" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ kind: 'release', sampleId: sample.id, releaseId: release.id })}>Approve release</Button> : null}</div></div>)}</section>)}</CardContent></Card>{mutation.error && !sampleAction ? <Alert variant="destructive"><AlertTitle>Laboratory operation failed</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Reload the order and try again.')}</AlertDescription></Alert> : null}<CancellationDecisionPanel workflowPath="lab-service-orders" recordId={order.id} version={order.version} requests={order.cancellationRequests} onSaved={onSaved} /><PlatformQuoteDialog open={quoteOpen} workflow="lab" recordId={order.id} version={order.version} catalogItems={catalogItems} onOpenChange={setQuoteOpen} onSaved={onSaved} />
    <Dialog open={sampleAction !== null} onOpenChange={(open) => !open && closeSampleDialog()}><DialogContent><DialogHeader><DialogTitle>{sampleDialogTitle(sampleAction)}</DialogTitle><DialogDescription>Operational changes are version-checked and appended to the authorized audit history.</DialogDescription></DialogHeader>{sampleAction?.kind === 'receive' ? <><div><Label htmlFor="sampleReceivedAt">Received at *</Label><Input id="sampleReceivedAt" type="datetime-local" className="mt-2" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} /></div><div><Label htmlFor="receiptCondition">Receipt condition *</Label><textarea id="receiptCondition" className="mt-2 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={receiptCondition} onChange={(event) => setReceiptCondition(event.target.value)} /></div></> : null}{sampleAction?.kind === 'accession' ? <div><Label htmlFor="sampleAccessionId">Accession identifier *</Label><Input id="sampleAccessionId" className="mt-2" value={accessionId} onChange={(event) => setAccessionId(event.target.value)} /></div> : null}{sampleAction?.kind === 'transition' ? <><div><Label htmlFor="sampleTargetStatus">New stage *</Label><select id="sampleTargetStatus" value={targetStatus} onChange={(event) => setTargetStatus(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">{sampleStatusOptions(sampleAction.sample.status).map((status) => <option key={status} value={status}>{status.replace(/([a-z])([A-Z])/g, '$1 $2')}</option>)}</select></div><div><Label htmlFor="sampleTenantReason">Customer-visible reason</Label><textarea id="sampleTenantReason" className="mt-2 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={tenantReason} onChange={(event) => setTenantReason(event.target.value)} /></div><div><Label htmlFor="sampleInternalNote">Internal note</Label><textarea id="sampleInternalNote" className="mt-2 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={internalNote} onChange={(event) => setInternalNote(event.target.value)} /></div></> : null}{sampleAction?.kind === 'upload' ? <><div><Label htmlFor="labResultFile">Result file *</Label><Input id="labResultFile" type="file" className="mt-2" onChange={(event) => setResultFile(event.target.files?.[0] ?? null)} /></div><div><Label htmlFor="analysisProfile">Analysis profile *</Label><Input id="analysisProfile" className="mt-2" value={analysisProfile} onChange={(event) => setAnalysisProfile(event.target.value)} /></div><div><Label htmlFor="pipelineVersion">Pipeline version *</Label><Input id="pipelineVersion" className="mt-2" value={pipelineVersion} onChange={(event) => setPipelineVersion(event.target.value)} /></div><div><Label htmlFor="resultProvenance">Provenance *</Label><textarea id="resultProvenance" className="mt-2 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={provenance} onChange={(event) => setProvenance(event.target.value)} /></div><div><Label htmlFor="resultQcStatus">QC status *</Label><Input id="resultQcStatus" className="mt-2" value={qcStatus} onChange={(event) => setQcStatus(event.target.value)} /></div></> : null}{mutation.error ? <Alert variant="destructive"><AlertTitle>Sample was not updated</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the values and try again.')}</AlertDescription></Alert> : null}<DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="button" disabled={!sampleActionReady(sampleAction, { receiptCondition, accessionId, targetStatus, tenantReason, resultFile, analysisProfile, pipelineVersion, provenance, qcStatus }) || mutation.isPending} onClick={() => mutation.mutate({ kind: 'sample' })}>{mutation.isPending ? 'Saving…' : 'Save operation'}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}

function sampleStatusOptions(current: string) {
  if (current === 'Accessioned') return ['LabAnalysis', 'OnHold', 'Rejected']
  if (current === 'LabAnalysis') return ['DataProcessing', 'OnHold', 'Rejected']
  if (current === 'DataProcessing') return ['DataAvailable', 'OnHold', 'Rejected']
  if (current === 'DataAvailable') return ['Completed', 'OnHold', 'Rejected']
  if (current === 'OnHold') return ['Accessioned', 'LabAnalysis', 'DataProcessing', 'DataAvailable', 'Rejected']
  return ['OnHold', 'Rejected']
}
function nextSampleStatus(current: string) { return sampleStatusOptions(current)[0] ?? '' }
function sampleDialogTitle(action: { kind: SampleAction; sample: LabSample } | null) {
  if (!action) return 'Sample operation'
  if (action.kind === 'receive') return `Receive ${action.sample.customerSampleId}`
  if (action.kind === 'accession') return `Accession ${action.sample.customerSampleId}`
  if (action.kind === 'upload') return `Upload result for ${action.sample.customerSampleId}`
  return `Change stage for ${action.sample.customerSampleId}`
}
function sampleActionReady(action: { kind: SampleAction; sample: LabSample } | null, values: { receiptCondition: string; accessionId: string; targetStatus: string; tenantReason: string; resultFile: File | null; analysisProfile: string; pipelineVersion: string; provenance: string; qcStatus: string }) {
  if (!action) return false
  if (action.kind === 'receive') return Boolean(values.receiptCondition.trim())
  if (action.kind === 'accession') return Boolean(values.accessionId.trim())
  if (action.kind === 'transition') return Boolean(values.targetStatus) && (!['OnHold', 'Rejected'].includes(values.targetStatus) || Boolean(values.tenantReason.trim()))
  return Boolean(values.resultFile && values.analysisProfile.trim() && values.pipelineVersion.trim() && values.provenance.trim() && values.qcStatus.trim())
}
