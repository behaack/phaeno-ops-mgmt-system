import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Eye, FolderPlus, Pencil } from 'lucide-react'
import { getLabBatchDetail, getLabOperationsError, transitionLabBatch, type LabBatch, type LabBatchDetail, type LabSupplier } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogReturnFocus } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Field as FormField } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { SequencingTubesDialog } from './SequencingTubesDialog'
import { PreparationActions, PreparationFormDialog } from './preparation-ui'
import { SendoutStatusDialog } from './SendoutStatusDialog'
import { VendorBatchDialog, type VendorDialogKind } from './VendorBatchDialog'
import { useNavigate } from '@tanstack/react-router'
import { nextVendorStage, vendorStageName, shipmentPairIssue, canRecordVendorResults } from './vendor-workflow'

const nowDateTimeLocal = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 19) }
export function SequencingBatchActions({ batch, suppliers, canManage, refresh, workspace, onDownloadManifest, onRecordResults, showResultsAction = true }: {
  batch: LabBatch; suppliers: LabSupplier[]; canManage: boolean; refresh: () => Promise<unknown>; workspace?: LabBatchDetail; onDownloadManifest?: () => void; onRecordResults?: () => void; showResultsAction?: boolean
}) {
  const transitionCancel = useRef<HTMLButtonElement>(null)
  const [tubeBatch, setTubeBatch] = useState<LabBatch | null>(null)
  const [transitionDialog, setTransitionDialog] = useState<{ batch: LabBatch; action: 'start' } | null>(null)
  const [transitionAt, setTransitionAt] = useState('')
  const [transitionOpen, setTransitionOpen] = useState(false)
  const [recoveryTarget, setRecoveryTarget] = useState<LabBatch | null>(null)
  const recovery = useMutation({
    mutationFn: ({ batch, reason }: { batch: LabBatch; reason: string }) => transitionLabBatch(batch.id, { version: batch.version, action: 'return-to-draft', reason }),
    onSuccess: async () => { setRecoveryTarget(null); await refresh() },
  })
  const transition = useMutation({ mutationFn: ({ id, version, action, occurredAtUtc }: { id: string; version: number; action: 'start'; occurredAtUtc: string }) => transitionLabBatch(id, { version, action, occurredAtUtc }), onSuccess: async () => { setTransitionOpen(false); await refresh() } })
  const [sendoutStatus, setSendoutStatus] = useState<{ batch: LabBatch; status: string } | null>(null)
  const [vendorAction, setVendorAction] = useState<{ batch: LabBatch; kind: VendorDialogKind } | null>(null)
  const navigate = useNavigate()
  const closeVendorDialog = (batchId: string) => {
    setVendorAction(null); setSendoutStatus(null)
    // Let both the form and its discard confirmation finish returning focus.
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(`sequencing-batch-actions-${batchId}`)?.focus()))
  }
  const vendorDetail = useQuery({ queryKey: ['lab-batch', vendorAction?.batch.id], queryFn: () => getLabBatchDetail(vendorAction!.batch.id), enabled: Boolean(vendorAction) })
  const statusWorkspace = workspace?.batch.id === sendoutStatus?.batch.id ? workspace : undefined
  const sendoutDetail = useQuery({ queryKey: ['lab-batch', sendoutStatus?.batch.id], queryFn: () => getLabBatchDetail(sendoutStatus!.batch.id), enabled: Boolean(sendoutStatus && !statusWorkspace) })
  const reviewedStatus = statusWorkspace ?? sendoutDetail.data
  const openTransition = (batch: LabBatch, action: 'start') => { transition.reset(); setTransitionDialog({ batch, action }); setTransitionOpen(true); setTransitionAt(nowDateTimeLocal()) }
  const saveTransition = () => {
    if (!transitionDialog || !transitionAt) return
    const occurredAtUtc = new Date(transitionAt)
    if (Number.isNaN(occurredAtUtc.getTime())) return
    transition.mutate({ id: transitionDialog.batch.id, version: transitionDialog.batch.version, action: transitionDialog.action, occurredAtUtc: occurredAtUtc.toISOString() })
  }

  const next = nextVendorStage(batch.sendoutStatus)
  const canPrepareTubes = canManage && ['Draft', 'InProgress'].includes(batch.status) && !batch.sendoutId
  const resultsRecorded = batch.sendoutStatus === 'Complete' && batch.vendorOutcome != null
  const preparationBlocked = workspace?.batch.id === batch.id && (workspace.tubes.members.length !== batch.memberCount || workspace.tubes.members.some(member => shipmentPairIssue(member)))
  return <>
    <PreparationActions triggerId={`sequencing-batch-actions-${batch.id}`} items={[
      { label: canPrepareTubes ? 'Prepare sequencing tubes' : 'View libraries', icon: canPrepareTubes ? undefined : <Eye aria-hidden="true" data-icon="inline-start" />, disabled: batch.memberCount === 0, onClick: () => setTubeBatch(batch) },
      ...(canManage && batch.status === 'Draft' ? [{ label: 'Begin shipment preparation', disabled: transition.isPending || batch.memberCount === 0, onClick: () => openTransition(batch, 'start') }] : []),
      ...(canManage && batch.status === 'InProgress' && batch.memberCount === 0 && !batch.sendoutId ? [{ label: 'Return empty batch to draft', disabled: recovery.isPending, onClick: () => { recovery.reset(); setRecoveryTarget(batch) } }] : []),
      ...(canManage && batch.status === 'InProgress' && !batch.sendoutId && batch.memberCount > 0 ? [{ label: 'Prepare vendor shipment', disabled: Boolean(preparationBlocked), onClick: () => setVendorAction({ batch: batch, kind: 'prepare' }) }] : []),
      ...(canManage && batch.sendoutId && batch.sendoutStatus !== 'Complete' ? [{ label: 'Update shipment and ETA', onClick: () => setVendorAction({ batch: batch, kind: 'shipment' }) }] : []),
      ...(canManage && batch.sendoutId && next ? [{ label: `Mark ${vendorStageName(next).toLowerCase()}`, onClick: () => setSendoutStatus({ batch: batch, status: next }) }] : []),
      ...(showResultsAction && canManage && canRecordVendorResults(batch) ? [{ label: resultsRecorded ? 'Edit results' : 'Record results', icon: resultsRecorded ? <Pencil aria-hidden="true" data-icon="inline-start" /> : <FolderPlus aria-hidden="true" data-icon="inline-start" />, onClick: onRecordResults ?? (() => void navigate({ to: '/lab-operations/batches/$batchId/record-results', params: { batchId: batch.id }, search: p => ({ ...p, section: 'batches' }) })) }] : []),
      ...(onDownloadManifest && batch.sendoutId ? [{ label: 'Download tube manifest', onClick: onDownloadManifest }] : []),
    ]} />
  {vendorAction && vendorDetail.data ? <VendorBatchDialog key={`${vendorAction.batch.id}-${vendorAction.kind}`} kind={vendorAction.kind} workspace={vendorDetail.data} onClose={() => closeVendorDialog(vendorAction.batch.id)} onSaved={refresh} /> : null}
  {vendorAction && !vendorDetail.data ? <Dialog open onOpenChange={open => !open && setVendorAction(null)}><DialogContent><DialogHeader><DialogTitle>Load batch workspace</DialogTitle></DialogHeader><div><p role={vendorDetail.isError ? 'alert' : 'status'}>{vendorDetail.isError ? 'The batch could not be loaded. Close and try again.' : 'Loading current batch details…'}</p></div><RequiredDialogFooter showLegend={false}><Button variant="outline" onClick={() => setVendorAction(null)}>Close</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
  {sendoutStatus && reviewedStatus?.sendout ? <SendoutStatusDialog key={`${reviewedStatus.batch.id}-${sendoutStatus.status}`} batch={reviewedStatus.batch} status={sendoutStatus.status} sendout={reviewedStatus.sendout} onClose={() => closeVendorDialog(sendoutStatus.batch.id)} onSaved={refresh} /> : null}
  {sendoutStatus && !reviewedStatus?.sendout ? <Dialog open onOpenChange={open => !open && setSendoutStatus(null)}><DialogContent><DialogHeader><DialogTitle>Review saved shipment</DialogTitle></DialogHeader><div><p role={sendoutDetail.isError || reviewedStatus ? 'alert' : 'status'}>{sendoutDetail.isError || reviewedStatus ? 'The saved shipment could not be loaded. Close and reopen to retry.' : 'Loading current shipment details…'}</p></div><RequiredDialogFooter showLegend={false}><Button variant="outline" onClick={() => setSendoutStatus(null)}>Close</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
  {recoveryTarget ? <DialogReturnFocus target={null} fallbackId={`sequencing-batch-actions-${recoveryTarget.id}`}>
    <PreparationFormDialog
      title="Return empty batch to draft"
      description="Correct a batch that was started before libraries were assigned."
      fields={[{ key: 'reason', label: 'Correction reason', required: true, type: 'textarea', maxLength: 4000 }]}
      initialFocus="cancel"
      submitLabel="Return to draft"
      pending={recovery.isPending}
      error={recovery.error ? getLabOperationsError(recovery.error, 'Refresh the batch and try again.') : undefined}
      onClose={() => setRecoveryTarget(null)}
      onSubmit={({ reason }) => recovery.mutate({ batch: recoveryTarget, reason: reason.trim() })}
    >
      <p className="text-sm"><strong>{recoveryTarget.batchNumber}</strong> will return to Draft so libraries can be added. The recorded start will be cleared; its previous value and your correction reason remain in the audit history. This is available only while the batch has no libraries or sendout.</p>
    </PreparationFormDialog>
  </DialogReturnFocus> : null}
  {tubeBatch ? <DialogReturnFocus target={null} fallbackId={`sequencing-batch-actions-${tubeBatch.id}`}><SequencingTubesDialog batchId={tubeBatch.id} batchName={tubeBatch.name} suppliers={suppliers} canManage={canManage} onClose={() => setTubeBatch(null)} onChanged={refresh} /></DialogReturnFocus> : null}
  <DialogReturnFocus target={null} fallbackId={transitionDialog ? `sequencing-batch-actions-${transitionDialog.batch.id}` : undefined}><Dialog open={transitionOpen} onOpenChange={open => { if (!open && !transition.isPending) setTransitionOpen(false) }}>
    <DialogContent onOpenAutoFocus={event => { event.preventDefault(); transitionCancel.current?.focus() }}>
      <DialogHeader>
        <DialogTitle>Begin shipment preparation</DialogTitle>
        <DialogDescription>Record when shipment preparation actually began. The time is prefilled with now and saved as UTC.</DialogDescription>
      </DialogHeader>
      <div className="my-5 grid gap-4">
        <p className="text-sm">{transitionDialog?.batch.name}{transitionDialog?.batch.name !== transitionDialog?.batch.batchNumber ? ` · ${transitionDialog?.batch.batchNumber}` : ''}</p>
        <FormField>
          <Label htmlFor="batch-transition-at"><RequiredFieldName>Preparation began at</RequiredFieldName></Label>
          <Input id="batch-transition-at" type="datetime-local" step="1" value={transitionAt} onChange={(event) => setTransitionAt(event.target.value)} required />
        </FormField>
      </div>
      {transition.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Batch transition failed</AlertTitle><AlertDescription>{getLabOperationsError(transition.error, 'Check the entered time and try again.')}</AlertDescription></Alert> : null}
      <RequiredDialogFooter>
        <Button ref={transitionCancel} type="button" variant="outline" disabled={transition.isPending} onClick={() => setTransitionOpen(false)}>Cancel</Button>
        <Button type="button" disabled={transition.isPending || !transitionAt} onClick={saveTransition}>Begin shipment preparation</Button>
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog></DialogReturnFocus>
  </>
}
