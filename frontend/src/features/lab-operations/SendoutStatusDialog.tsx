import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { getLabOperationsError, transitionLabSendout, type LabBatch, type LabBatchDetail } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogReturnFocus, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { useOrderDecisionDismissal } from '#/features/orders/use-order-decision-dismissal'
import { PreparationField, prepSelectClass } from './preparation-ui'
import { operationalInputProps } from './lab-presentation'
import { vendorStageName } from './vendor-workflow'

const schema = z.object({ occurredAt: z.string().min(1, 'Record when this occurred.').refine(value => Number.isFinite(new Date(value).getTime()), 'Enter a valid time.'), evidence: z.string().trim().min(1, 'Record the provider or custody evidence.').max(4000), providerReference: z.string().trim().max(255), eta: z.string() })
const localNow = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 19) }
const localTime = (value: string) => { const time = new Date(value); return new Date(time.getTime() - time.getTimezoneOffset() * 60_000).toISOString().slice(0, 19) }
export function SendoutStatusDialog({ batch: currentBatch, status, sendout, onClose, onSaved }: { batch: LabBatch; status: string; sendout: NonNullable<LabBatchDetail['sendout']>; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const cancel = useRef<HTMLButtonElement>(null)
  const { batch, sendout: reviewed } = useRef({ batch: currentBatch, sendout }).current
  const shipmentReady = status !== 'Shipped' || Boolean(reviewed.destination?.trim() && reviewed.carrier?.trim() && reviewed.trackingReference?.trim())
  const validation = schema.superRefine((values, ctx) => { if (status === 'ReceivedByProvider' && (!values.eta || !Number.isFinite(new Date(values.eta).getTime()))) ctx.addIssue({ code: 'custom', path: ['eta'], message: 'Record the vendor completion ETA.' }) })
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(validation), defaultValues: { occurredAt: localNow(), evidence: '', providerReference: reviewed.providerReference ?? '', eta: status === 'ReceivedByProvider' && reviewed.expectedCompletionAtUtc ? localTime(reviewed.expectedCompletionAtUtc) : '' } })
  const save = useMutation({ mutationFn: (values: z.infer<typeof schema>) => transitionLabSendout(batch.sendoutId!, { status, version: batch.sendoutVersion!, occurredAtUtc: new Date(values.occurredAt).toISOString(), evidence: values.evidence, providerReference: values.providerReference || null, expectedCompletionAtUtc: values.eta ? new Date(values.eta).toISOString() : null }), onSuccess: async () => { await onSaved(); onClose() } })
  const dismissal = useOrderDecisionDismissal(form.formState.isDirty, save.isPending, onClose, { scope: 'vendor status evidence', description: `Unsaved status evidence for ${batch.batchNumber} will be discarded. The saved vendor stage will remain ${vendorStageName(batch.sendoutStatus ?? 'Preparing').toLowerCase()}.` })
  return <DialogReturnFocus target={null} fallbackId={`sequencing-batch-actions-${batch.id}`}><Dialog open onOpenChange={open => { if (!open) dismissal.close() }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus() }}><form className="contents" noValidate onSubmit={form.handleSubmit(values => save.mutate(values))}>
    <DialogHeader><DialogTitle>Mark {vendorStageName(status).toLowerCase()}</DialogTitle></DialogHeader>
    <div className="space-y-4">
      <p className="break-words text-sm"><strong>{batch.batchNumber}</strong>{batch.name.trim() && batch.name !== batch.batchNumber ? ` · ${batch.name}` : ''} · Vendor: <strong>{reviewed.providerName}</strong></p>
      <dl className="space-y-2 rounded-md border p-3 text-sm">{[['Sequencing service', reviewed.vendorProductName], ['Saved destination', reviewed.destination], ['Carrier', reviewed.carrier], ['Tracking reference', reviewed.trackingReference]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="whitespace-pre-line break-words">{value || 'Not recorded'}</dd></div>)}</dl>
      {!shipmentReady ? <p role="alert" className="text-sm text-destructive">Before dispatch, use Update shipment and ETA to record the destination, carrier and tracking reference.</p> : null}
      <p className="text-sm">The sendout changes from {vendorStageName(batch.sendoutStatus ?? 'Preparing').toLowerCase()} to <strong>{vendorStageName(status).toLowerCase()}</strong>. Record when this actually occurred and the evidence supporting it. Your entry time and operator identity are recorded separately.</p>
      <PreparationField id="sendout-occurred" label="Actual occurrence time" required error={form.formState.errors.occurredAt?.message}><Input id="sendout-occurred" type="datetime-local" step="1" {...form.register('occurredAt')} /></PreparationField>
      <PreparationField id="sendout-reference" label="Vendor reference (optional)" error={form.formState.errors.providerReference?.message}><Input id="sendout-reference" {...operationalInputProps} {...form.register('providerReference')} /></PreparationField>
      {status === 'ReceivedByProvider' ? <PreparationField id="sendout-eta" label="Vendor expected completion" required error={form.formState.errors.eta?.message}><Input id="sendout-eta" type="datetime-local" step="1" {...form.register('eta')} /></PreparationField> : null}
      {status === 'ReceivedByProvider' ? <p className="text-xs text-muted-foreground">Review the saved ETA against the vendor receipt confirmation and update it if needed.</p> : null}
      <PreparationField id="sendout-evidence" label="Provider or custody evidence" required error={form.formState.errors.evidence?.message}><textarea id="sendout-evidence" className={`${prepSelectClass} min-h-24 py-2`} maxLength={4000} {...form.register('evidence')} /></PreparationField>
      {save.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(save.error, 'Refresh the batch and review the status and entered time before retrying.')}</p> : null}
    </div>
    <RequiredDialogFooter><Button ref={cancel} type="button" variant="outline" disabled={save.isPending} onClick={dismissal.close}>Cancel</Button><Button type="submit" disabled={save.isPending || !shipmentReady}>{save.isPending ? 'Saving…' : `Mark ${vendorStageName(status).toLowerCase()}`}</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>{dismissal.confirmation}</DialogReturnFocus>
}
