import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { acceptRemainingLabTubes, accessionShipmentTube, getLabOperationsError, type LabContainer, type LabWorkOrderDetail } from '#/api/lab-operations'
import type { SampleShippingCrosswalkItem, SampleShippingPacketScan } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { IntakeReviewFields, type IntakeReviewValues } from './IntakeReviewFields'

const storage = z.string().trim().max(255, 'Use up to 255 characters.').refine(value => !Array.from(value).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127), 'Use a barcode without control characters.')
const inspected = z.boolean().refine(Boolean, 'Confirm the inspection before saving.')
const exceptionSchema = z.object({ freezerBoxBarcode: storage, confirmed: inspected })
type ExceptionValues = z.infer<typeof exceptionSchema>
const initialException: IntakeReviewValues = { disposition: 'Rejected', reasonCode: '', notes: '' }

export function TubeIntakeExceptionDialog({ row, packet, existing, onClose, onSaved }: { row: SampleShippingCrosswalkItem; packet: SampleShippingPacketScan; existing?: LabContainer; onClose: () => void; onSaved: (work: LabWorkOrderDetail) => Promise<void> }) {
  const [intake, setIntake] = useState(initialException)
  const form = useForm<ExceptionValues>({ resolver: zodResolver(exceptionSchema.superRefine((v, ctx) => {
    if (intake.disposition !== 'Rejected' && !v.freezerBoxBarcode) ctx.addIssue({ code: 'custom', path: ['freezerBoxBarcode'], message: 'Record the real storage location for the retained tube.' })
  })), defaultValues: { freezerBoxBarcode: existing?.location ?? '', confirmed: false } })
  const save = useMutation({ mutationFn: (values: ExceptionValues) => accessionShipmentTube(packet.labWorkOrderId, packet.shipmentId, { packetBarcode: packet.barcode, supplierTubeBarcode: row.supplierTubeBarcode!, freezerBoxBarcode: values.freezerBoxBarcode || null, intakeDisposition: intake.disposition, intakeReasonCode: intake.reasonCode || null, intakeNotes: intake.notes || null }), retry: false, onSuccess: onSaved })
  const dirty = form.formState.isDirty || intake !== initialException
  const confirmLeave = () => !dirty || window.confirm('Discard this unsaved intake exception? Previously saved decisions will be kept.')
  useBlocker({ shouldBlockFn: () => save.isPending || !confirmLeave(), enableBeforeUnload: () => dirty || save.isPending })
  const close = () => { if (!save.isPending && confirmLeave()) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent onCloseAutoFocus={event => event.preventDefault()}>
    <DialogHeader><DialogTitle>Record tube exception</DialogTitle><DialogDescription>{row.customerSampleId} · {row.supplierTubeBarcode}. Match the received tube or damaged remains to this expected shipment tube.</DialogDescription></DialogHeader>
    <form id="tube-exception" className="space-y-4" onSubmit={form.handleSubmit(v => { if (!save.isPending) save.mutate(v) })}>
      <IntakeReviewFields value={intake} onChange={setIntake} exceptionsOnly disabled={save.isPending} />
      <div><Label htmlFor="exception-storage">{intake.disposition === 'Rejected' ? 'Storage location (only if retained)' : <RequiredFieldName>Storage location</RequiredFieldName>}</Label><Input id="exception-storage" className="mt-2 font-mono" {...form.register('freezerBoxBarcode')} readOnly={Boolean(existing?.location) || save.isPending} required={intake.disposition !== 'Rejected'} aria-invalid={Boolean(form.formState.errors.freezerBoxBarcode)} aria-describedby="exception-storage-help" /><p id="exception-storage-help" className="mt-2 text-xs text-muted-foreground">{existing?.location ? 'The existing storage location is retained.' : 'A broken or destroyed tube needs no storage location. Rejected material is never available for processing.'}</p>{form.formState.errors.freezerBoxBarcode ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.freezerBoxBarcode.message}</p> : null}</div>
      <Label className="flex cursor-pointer items-start gap-2 leading-snug"><input type="checkbox" required disabled={save.isPending} {...form.register('confirmed')} className="mt-0.5 size-4 shrink-0 cursor-pointer" /><RequiredFieldName>I have identified the received tube or damaged remains and recorded the observed condition.</RequiredFieldName></Label>
      {form.formState.errors.confirmed ? <p role="alert">{form.formState.errors.confirmed.message}</p> : null}
    </form>
    {save.error ? <Alert variant="destructive"><AlertTitle>Exception was not saved</AlertTitle><AlertDescription>{getLabOperationsError(save.error, 'Review the details and retry. Your entries are preserved.')}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button variant="outline" disabled={save.isPending} onClick={close}>Cancel</Button><Button type="submit" form="tube-exception" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save exception'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

const batchSchema = z.object({ confirmed: inspected, tubes: z.array(z.object({ supplierTubeBarcode: z.string().min(1), freezerBoxBarcode: storage.refine(Boolean, 'Scan the actual freezer box for this tube.') })).min(1).max(500) })
type BatchValues = z.infer<typeof batchSchema>
export function AcceptRemainingTubesDialog({ rows, packet, work, onClose, onSaved }: { rows: SampleShippingCrosswalkItem[]; packet: SampleShippingPacketScan; work: LabWorkOrderDetail; onClose: () => void; onSaved: (work: LabWorkOrderDetail, barcodes: string[]) => Promise<void> }) {
  const client = useQueryClient()
  // Freeze the reviewed selection and version. A refresh cannot expand the batch or silently overwrite a decision.
  const [selection] = useState(rows)
  const [version] = useState(work.workOrder.version)
  const [requestId] = useState(() => crypto.randomUUID())
  const form = useForm<BatchValues>({ resolver: zodResolver(batchSchema), defaultValues: { confirmed: false, tubes: selection.map(row => ({ supplierTubeBarcode: row.supplierTubeBarcode!, freezerBoxBarcode: work.containers.find(t => t.barcode === row.supplierTubeBarcode)?.location ?? '' })) } })
  const save = useMutation({ mutationFn: (values: BatchValues) => acceptRemainingLabTubes(packet.labWorkOrderId, packet.shipmentId, { requestId, packetBarcode: packet.barcode, workOrderVersion: version, inspectionConfirmed: values.confirmed, tubes: values.tubes }), retry: false, onSuccess: (detail, values) => onSaved(detail, values.tubes.map(t => t.supplierTubeBarcode)), onError: async () => { await client.invalidateQueries({ queryKey: ['lab-work-order', packet.labWorkOrderId] }) } })
  const confirmLeave = () => !form.formState.isDirty || window.confirm('Discard the unsaved storage entries? The identified tubes will remain selected.')
  useBlocker({ shouldBlockFn: () => save.isPending || !confirmLeave(), enableBeforeUnload: () => form.formState.isDirty || save.isPending })
  const close = () => { if (!save.isPending && confirmLeave()) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="sm:max-w-2xl" onCloseAutoFocus={event => event.preventDefault()}>
    <DialogHeader><DialogTitle>Accept {selection.length} remaining tube{selection.length === 1 ? '' : 's'}</DialogTitle><DialogDescription>Only the identified tubes below will be accepted. Recorded exceptions and unidentified tubes are excluded. Record the actual storage location for each accepted tube.</DialogDescription></DialogHeader>
    <form id="accept-remaining-tubes" className="space-y-4" onSubmit={form.handleSubmit(v => { if (!save.isPending) save.mutate(v) })}>
      {selection.map((row, index) => <div key={row.supplierTubeBarcode} className="space-y-2 rounded-lg border bg-muted/30 p-4"><p className="text-sm font-medium">{row.customerSampleId} · <span className="font-mono break-all">{row.supplierTubeBarcode}</span></p><Label htmlFor={`batch-storage-${index}`}><RequiredFieldName>Freezer box barcode</RequiredFieldName></Label><Input id={`batch-storage-${index}`} className="font-mono" required autoComplete="off" spellCheck={false} readOnly={save.isPending || Boolean(work.containers.find(t => t.barcode === row.supplierTubeBarcode)?.location)} {...form.register(`tubes.${index}.freezerBoxBarcode`)} aria-invalid={Boolean(form.formState.errors.tubes?.[index]?.freezerBoxBarcode)} aria-describedby={form.formState.errors.tubes?.[index]?.freezerBoxBarcode ? `batch-error-${index}` : undefined} />{form.formState.errors.tubes?.[index]?.freezerBoxBarcode ? <p id={`batch-error-${index}`} role="alert" className="text-sm text-destructive">{form.formState.errors.tubes[index]?.freezerBoxBarcode?.message}</p> : null}</div>)}
      <Label className="flex cursor-pointer items-start gap-2 leading-snug"><input type="checkbox" required disabled={save.isPending} {...form.register('confirmed')} className="mt-0.5 size-4 shrink-0 cursor-pointer" /><RequiredFieldName>I inspected every listed tube, recorded all exceptions separately, and confirm these tubes are acceptable.</RequiredFieldName></Label>
      {form.formState.errors.confirmed ? <p role="alert">{form.formState.errors.confirmed.message}</p> : null}
    </form>
    {save.error ? <Alert variant="destructive"><AlertTitle>Acceptance could not be confirmed</AlertTitle><AlertDescription>{getLabOperationsError(save.error, 'Your entries are preserved. Retry the same request if the connection failed; if a record changed, close this dialog and review the refreshed selection.')}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button variant="outline" disabled={save.isPending} onClick={close}>Cancel</Button><Button type="submit" form="accept-remaining-tubes" disabled={save.isPending}>{save.isPending ? 'Saving…' : `Accept ${selection.length} tube${selection.length === 1 ? '' : 's'}`}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
