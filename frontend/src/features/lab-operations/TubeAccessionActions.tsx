import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { accessionShipmentTube, getLabOperationsError, type LabContainer, type LabWorkOrderDetail } from '#/api/lab-operations'
import type { SampleShippingCrosswalkItem, SampleShippingPacketScan } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { IntakeReviewFields, type IntakeReviewValues } from './IntakeReviewFields'
import { useOrderDecisionDismissal } from '#/features/orders/use-order-decision-dismissal'

const storage = z.string().trim().max(255, 'Use up to 255 characters.').refine(value => !Array.from(value).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127), 'Use a barcode without control characters.')
const inspected = z.boolean().refine(Boolean, 'Confirm the inspection before saving.')
const exceptionSchema = z.object({ freezerBoxBarcode: storage, confirmed: inspected })
type ExceptionValues = z.infer<typeof exceptionSchema>
const initialException: IntakeReviewValues = { disposition: 'Rejected', reasonCode: '', notes: '' }

export function TubeIntakeExceptionDialog({ row, packet, existing, pendingBox, available = true, onClose, onSaved }: { row: SampleShippingCrosswalkItem; packet: SampleShippingPacketScan; existing?: LabContainer; pendingBox?: string | null; available?: boolean; onClose: () => void; onSaved: (work: LabWorkOrderDetail) => Promise<void> }) {
  const [intake, setIntake] = useState(initialException)
  const form = useForm<ExceptionValues>({ resolver: zodResolver(exceptionSchema.superRefine((v, ctx) => {
    if (intake.disposition !== 'Rejected' && !v.freezerBoxBarcode) ctx.addIssue({ code: 'custom', path: ['freezerBoxBarcode'], message: 'Record the real storage location for the retained tube.' })
  })), defaultValues: { freezerBoxBarcode: existing?.location ?? '', confirmed: false } })
  const save = useMutation({ mutationFn: (values: ExceptionValues) => accessionShipmentTube(packet.labWorkOrderId, packet.shipmentId, { packetBarcode: packet.barcode, supplierTubeBarcode: row.supplierTubeBarcode!, freezerBoxBarcode: values.freezerBoxBarcode || null, intakeDisposition: intake.disposition, intakeReasonCode: intake.reasonCode || null, intakeNotes: intake.notes || null }), retry: false, onSuccess: onSaved })
  const dirty = form.formState.isDirty || intake !== initialException
  const dismissal = useOrderDecisionDismissal(dirty, save.isPending, onClose, { scope: 'intake exception', description: 'This unsaved intake exception will be discarded. Previously saved decisions and storage records will be kept.' })
  const close = () => dismissal.close()
  return <><Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent onCloseAutoFocus={event => event.preventDefault()}>
    <DialogHeader><DialogTitle>Record tube exception</DialogTitle><DialogDescription>{row.customerSampleId} · {row.supplierTubeBarcode}. Match the received tube or damaged remains to this expected shipment tube.</DialogDescription></DialogHeader>
    <form id="tube-exception" className="space-y-4" onSubmit={form.handleSubmit(v => { if (available && !save.isPending) save.mutate(v) })}>
      {pendingBox ? <p className="text-sm">This tube is in the unsaved {pendingBox} group. Reconcile its physical location before saving the exception. It will be excluded from that box’s accepted contents; record its actual location if retained.</p> : null}
      {!available ? <p role="status" className="text-sm text-destructive">Intake is unavailable. Keep these entries and return to an authorized, connected session before saving.</p> : null}
      <IntakeReviewFields value={intake} onChange={setIntake} exceptionsOnly disabled={save.isPending} />
      <div><Label htmlFor="exception-storage">{intake.disposition === 'Rejected' ? 'Storage location (only if retained)' : <RequiredFieldName>Storage location</RequiredFieldName>}</Label><Input id="exception-storage" className="mt-2 font-mono" {...form.register('freezerBoxBarcode')} readOnly={Boolean(existing?.location) || save.isPending} required={intake.disposition !== 'Rejected'} aria-invalid={Boolean(form.formState.errors.freezerBoxBarcode)} aria-describedby="exception-storage-help" /><p id="exception-storage-help" className="mt-2 text-xs text-muted-foreground">{existing?.location ? 'The existing storage location is retained.' : 'A broken or destroyed tube needs no storage location. Rejected material is never available for processing.'}</p>{form.formState.errors.freezerBoxBarcode ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.freezerBoxBarcode.message}</p> : null}</div>
      <Label className="flex cursor-pointer items-start gap-2 leading-snug"><input type="checkbox" required disabled={save.isPending} {...form.register('confirmed')} className="mt-0.5 size-4 shrink-0 cursor-pointer" /><RequiredFieldName>I have identified the received tube or damaged remains and recorded the observed condition.</RequiredFieldName></Label>
      {form.formState.errors.confirmed ? <p role="alert">{form.formState.errors.confirmed.message}</p> : null}
    </form>
    {save.error ? <Alert variant="destructive"><AlertTitle>Exception was not saved</AlertTitle><AlertDescription>{getLabOperationsError(save.error, 'Review the details and retry. Your entries are preserved.')}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button variant="outline" disabled={save.isPending} onClick={close}>Cancel</Button><Button type="submit" form="tube-exception" disabled={!available || save.isPending}>{save.isPending ? 'Saving…' : 'Save exception'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>{dismissal.confirmation}</>
}
