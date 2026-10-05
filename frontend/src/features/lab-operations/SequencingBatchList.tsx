import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Plus } from 'lucide-react'
import { getLabBatchDetail, getLabOperationsDashboard, getLabOperationsError, recordLabCustody, transitionLabBatch, type LabBatch, type LabBatchDetail } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogReturnFocus } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Field as FormField } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { LabBatchBarcodeScanner } from './LabBarcodeScanner'
import { SequencingTubesDialog } from './SequencingTubesDialog'
import { PreparationActions, PreparationField, PreparationFormDialog } from './preparation-ui'
import { SendoutStatusDialog } from './SendoutStatusDialog'
import { labCount, labStatus, operationalInputProps } from './lab-presentation'
import { VendorBatchDialog, type VendorDialogKind } from './VendorBatchDialog'
import { nextVendorStage, vendorStage, vendorStageName, vendorEtaOverdue, shipmentPairIssue } from './vendor-workflow'
const humanize = labStatus
const formatDate = (value: string) => new Date(value).toLocaleString()
const nowDateTimeLocal = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 19) }
export function SequencingBatchList({ items, suppliers, canManage, onCreate, refresh, detail = false, workspace, onDownloadManifest }: { items: Awaited<ReturnType<typeof getLabOperationsDashboard>>['batches']; suppliers: Awaited<ReturnType<typeof getLabOperationsDashboard>>['suppliers']; canManage: boolean; onCreate: () => void; refresh: () => Promise<unknown>; detail?: boolean; workspace?: LabBatchDetail; onDownloadManifest?: () => void }) {
  const transitionCancel = useRef<HTMLButtonElement>(null)
  const [tubeBatch, setTubeBatch] = useState<LabBatch | null>(null)
  const [dialog, setDialog] = useState<{ batch: LabBatch; kind: 'custody' } | null>(null)
  const [transitionDialog, setTransitionDialog] = useState<{ batch: LabBatch; action: 'start' } | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState('All')
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
  const closeVendorDialog = (batchId: string) => {
    setVendorAction(null); setSendoutStatus(null)
    // Let both the form and its discard confirmation finish returning focus.
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(`sequencing-batch-actions-${batchId}`)?.focus()))
  }
  const vendorDetail = useQuery({ queryKey: ['lab-batch', vendorAction?.batch.id], queryFn: () => getLabBatchDetail(vendorAction!.batch.id), enabled: Boolean(vendorAction) })
  const statusWorkspace = workspace?.batch.id === sendoutStatus?.batch.id ? workspace : undefined
  const sendoutDetail = useQuery({ queryKey: ['lab-batch', sendoutStatus?.batch.id], queryFn: () => getLabBatchDetail(sendoutStatus!.batch.id), enabled: Boolean(sendoutStatus && !statusWorkspace) })
  const reviewedStatus = statusWorkspace ?? sendoutDetail.data
  const save = useMutation({ mutationFn: async () => {
    if (!dialog) throw new Error('Choose a batch action.')
    return recordLabCustody(dialog.batch.sendoutId!, { labContainerId: null, eventCode: form.eventCode, locationOrParty: form.locationOrParty, detailsJson: JSON.stringify({ carrierReference: form.carrierReference?.trim() || null, notes: form.custodyNotes?.trim() || null }) })
  }, onSuccess: async () => { setDialog(null); setForm({}); await refresh() } })
  const openBatchAction = (batch: LabBatch, kind: 'custody') => { save.reset(); setForm({}); setDialog({ batch, kind }) }
  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const filteredItems = statusFilter === 'All' ? items : items.filter(item => statusFilter === 'Draft' ? item.status === 'Draft' : statusFilter === 'Unrecorded' ? item.status === 'Complete' && !item.vendorOutcome : (item.vendorOutcome ?? item.sendoutStatus ?? (item.status === 'InProgress' ? 'Preparing' : item.status)) === statusFilter)
  const openTransition = (batch: LabBatch, action: 'start') => { transition.reset(); setTransitionDialog({ batch, action }); setTransitionOpen(true); setTransitionAt(nowDateTimeLocal()) }
  const saveTransition = () => {
    if (!transitionDialog || !transitionAt) return
    const occurredAtUtc = new Date(transitionAt)
    if (Number.isNaN(occurredAtUtc.getTime())) return
    transition.mutate({ id: transitionDialog.batch.id, version: transitionDialog.batch.version, action: transitionDialog.action, occurredAtUtc: occurredAtUtc.toISOString() })
  }

  return (
    <>
      <div className="space-y-5">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-muted/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{detail ? 'Batch status and next action' : 'Sequencing batches'}</CardTitle>
                <CardDescription>Libraries may cross Commercial orders while retaining work-order and specimen lineage.</CardDescription>
              </div>
              {!detail ? <div className="flex flex-wrap items-end gap-3">
                <FormField>
                  <Label htmlFor="batch-status-filter">Status</Label>
                  <NativeSelect
                    id="batch-status-filter"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="All">All statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Preparing">Prepare shipment</option>
                    <option value="Shipped">Shipped</option>
                    <option value="ReceivedByProvider">Vendor received</option>
                    <option value="Sequencing">Sequencing</option>
                    <option value="ResultsReceived">Results received</option>
                    <option value="Success">Success</option>
                    <option value="Failure">Failure</option>
                    <option value="Unrecorded">Complete · outcome unrecorded</option>
                  </NativeSelect>
                </FormField>
                {canManage ? <Button type="button" onClick={onCreate}><Plus data-icon="inline-start" /> New batch</Button> : null}
              </div> : null}
            </div>
            {canManage && (!detail || items[0]?.status === 'Draft') ? <details className="group/scan mt-3 border-t pt-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"><ChevronRight aria-hidden="true" className="size-4 shrink-0 group-open/scan:rotate-90" />Scan libraries</summary>
              <div className="mt-3"><LabBatchBarcodeScanner batches={items} suppliers={suppliers} onAdded={refresh} /></div>
            </details> : null}
          </CardHeader>
          <CardContent className="p-4">
            {filteredItems.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No batches match this status.</p>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const next = nextVendorStage(item.sendoutStatus)
                  const preparationBlocked = workspace?.batch.id === item.id && (workspace.tubes.members.length !== item.memberCount || workspace.tubes.members.some(member => shipmentPairIssue(member)))
                  return (
                    <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 rounded-lg border bg-muted/30 p-4 shadow-xs sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <div className="min-w-0 break-words">
                        <Link to="/lab-operations/batches/$batchId" params={{ batchId: item.id }} className="font-medium text-primary underline underline-offset-4">{item.batchNumber}</Link>
                      </div>
                      <div className="col-span-2 min-w-0 break-words sm:col-span-1 sm:col-start-1 sm:row-start-2">
                        <p className="text-xs text-muted-foreground">
                          {item.name !== item.batchNumber ? `${item.name} · ` : ''}{humanize(item.batchType)} · {labCount(item.memberCount, 'library', 'libraries')}
                          {item.startedAtUtc ? ` · started ${formatDate(item.startedAtUtc)}` : ''}
                          {item.completedAtUtc ? ` · completed ${formatDate(item.completedAtUtc)}` : ''}
                          {item.providerName ? ` · ${item.providerName}` : ''}
                          {item.libraryExceptionCount ? ` · ${labCount(item.libraryExceptionCount, 'library exception')}` : ''}
                        </p>
                        {item.trackingReference ? <p className="mt-1 break-all text-xs text-muted-foreground">Tracking: {item.trackingReference}</p> : null}
                        {item.expectedCompletionAtUtc ? <p className={`mt-1 text-xs ${vendorEtaOverdue(item) ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>Expected completion: {formatDate(item.expectedCompletionAtUtc)}{vendorEtaOverdue(item) ? ' · Overdue' : ''}</p> : null}
                        {item.memberCount === 0 && item.status === 'Draft' ? <p className="mt-2 text-sm text-muted-foreground">Add passing libraries from Library prep or Scan libraries before starting this batch.</p> : null}
                        {item.memberCount === 0 && item.status === 'InProgress' && !item.sendoutId ? <p className="mt-2 text-sm text-muted-foreground">This batch has no libraries. Return it to draft before adding libraries.</p> : null}
                        {preparationBlocked && !item.sendoutId ? <p className="mt-2 text-sm text-muted-foreground">Complete every tube pair in Sequencing tubes before preparing the vendor shipment.</p> : null}
                      </div>
                      <div className="col-span-2 row-start-3 mt-2 flex min-w-0 sm:col-span-1 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0">
                        <Status value={vendorStage(item)} />
                      </div>
                      <div className="col-start-2 row-start-1 flex min-w-0 justify-end sm:col-start-3 sm:row-span-2 [&>button]:shrink-0">
                        <PreparationActions triggerId={`sequencing-batch-actions-${item.id}`} items={[
                          { label: 'Sequencing tubes', disabled: item.memberCount === 0, onClick: () => setTubeBatch(item) },
                          ...(canManage && item.status === 'Draft' ? [{ label: 'Begin shipment preparation', disabled: transition.isPending || item.memberCount === 0, onClick: () => openTransition(item, 'start') }] : []),
                          ...(canManage && item.status === 'InProgress' && item.memberCount === 0 && !item.sendoutId ? [{ label: 'Return empty batch to draft', disabled: recovery.isPending, onClick: () => { recovery.reset(); setRecoveryTarget(item) } }] : []),
                          ...(canManage && item.status === 'InProgress' && !item.sendoutId && item.memberCount > 0 ? [{ label: 'Prepare vendor shipment', disabled: Boolean(preparationBlocked), onClick: () => setVendorAction({ batch: item, kind: 'prepare' }) }] : []),
                          ...(canManage && item.sendoutId && item.sendoutStatus !== 'Complete' ? [{ label: 'Update shipment and ETA', onClick: () => setVendorAction({ batch: item, kind: 'shipment' }) }] : []),
                          ...(canManage && item.sendoutId ? [{ label: 'Custody event', onClick: () => openBatchAction(item, 'custody') }] : []),
                          ...(canManage && item.sendoutId && next ? [{ label: `Mark ${vendorStageName(next).toLowerCase()}`, onClick: () => setSendoutStatus({ batch: item, status: next }) }] : []),
                          ...(canManage && item.sendoutStatus === 'ResultsReceived' ? [{ label: 'Record final outcome', onClick: () => setVendorAction({ batch: item, kind: 'outcome' }) }] : []),
                          ...(canManage && item.sendoutId && ['ResultsReceived', 'Complete'].includes(item.sendoutStatus ?? '') ? [{ label: 'Add external storage reference', onClick: () => setVendorAction({ batch: item, kind: 'reference' }) }] : []),
                          ...(onDownloadManifest && item.sendoutId ? [{ label: 'Download tube manifest', onClick: onDownloadManifest }] : []),
                        ]} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
      {tubeBatch ? <SequencingTubesDialog batchId={tubeBatch.id} batchName={tubeBatch.name} suppliers={suppliers} canManage={canManage} onClose={() => setTubeBatch(null)} onChanged={refresh} /> : null}
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
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record custody event</DialogTitle>
            <DialogDescription>Provider-neutral metadata and custody evidence only; no sequencing files or pipeline orchestration are created.</DialogDescription>
          </DialogHeader>
          <div className="my-5 grid gap-4">
              <>
                <Field label="Event code" value={form.eventCode} onChange={set('eventCode')} required />
                <Field label="Location or party" value={form.locationOrParty} onChange={set('locationOrParty')} required />
                <Field label="Carrier or tracking reference (optional)" value={form.carrierReference} onChange={set('carrierReference')} />
                <TextField label="Custody note (optional)" value={form.custodyNotes} onChange={set('custodyNotes')} />
              </>
          </div>
          {save.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Batch action failed</AlertTitle><AlertDescription>{getLabOperationsError(save.error, 'Check the entered values.')}</AlertDescription></Alert> : null}
          <RequiredDialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>Save</Button>
          </RequiredDialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Field({ label, value = '', onChange, required, type = 'text' }: { label: string; value?: string; onChange: React.ChangeEventHandler<HTMLInputElement>; required?: boolean; type?: string }) { const id = `batch-${label.toLowerCase().replaceAll(' ', '-')}`; return <PreparationField id={id} label={label} required={required}><Input id={id} {...operationalInputProps} type={type} value={value} onChange={onChange} required={required} /></PreparationField> }
function TextField({ label, value = '', onChange }: { label: string; value?: string; onChange: React.ChangeEventHandler<HTMLTextAreaElement> }) { const id = `batch-${label.toLowerCase().replaceAll(' ', '-')}`; return <PreparationField id={id} label={label}><textarea id={id} className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={value} onChange={onChange} /></PreparationField> }
function Status({ value }: { value: string }) { return <span className="min-w-0 break-words rounded-full border bg-muted px-2.5 py-1 text-xs font-medium">{labStatus(value)}</span> }
