import { useRef, useState } from 'react'
import { useForm, useFieldArray, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { getSequencingVendors, type SequencingVendor, addVendorResultReference, createLabSendout, finalizeVendorOutcome, getLabOperationsError, updateVendorShipment, type LabBatchDetail } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogReturnFocus } from '#/components/ui/dialog'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { useOrderDecisionDismissal } from '#/features/orders/use-order-decision-dismissal'
import { PreparationField, prepSelectClass } from './preparation-ui'
import { labAmount, labCount, operationalInputProps } from './lab-presentation'
import { shipmentPairIssue } from './vendor-workflow'

export type VendorDialogKind = 'prepare' | 'shipment' | 'reference' | 'outcome'
const localTime = (value?: string | null) => { const time = value ? new Date(value) : new Date(); return new Date(time.getTime() - time.getTimezoneOffset() * 60_000).toISOString().slice(0, 19) }
const titles: Record<VendorDialogKind, string> = { prepare: 'Prepare vendor shipment', shipment: 'Update shipment and ETA', reference: 'Add external storage reference', outcome: 'Record final batch outcome' }
const baseSchema = z.object({ vendorSupplierId: z.string(), vendorProductId: z.string(), vendorShipmentAddressId: z.string(), vendorSupplierVersion: z.number(), vendorProductVersion: z.number(), vendorShipmentAddressVersion: z.number(), carrier: z.string().trim().max(255), tracking: z.string().trim().max(255), providerReference: z.string().trim().max(255), eta: z.string(), evidence: z.string().trim().max(4000), label: z.string().trim().max(255), storage: z.string().trim().max(2000), memberId: z.string(), outcome: z.enum(['Success', 'Failure']), occurredAt: z.string(), exceptions: z.array(z.object({ memberId: z.string().min(1), reason: z.string().trim().min(1, 'Record the exception reason.').max(4000) })) })
export function VendorBatchDialog({ kind, workspace, onClose, onSaved }: { kind: VendorDialogKind; workspace: LabBatchDetail; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const cancel = useRef<HTMLButtonElement>(null)
  const requestId = useRef(crypto.randomUUID())
  // Keep the reviewed data/version and retry payload stable during background refreshes.
  const reviewed = useRef(workspace).current
  const { batch, sendout, tubes } = reviewed
  const readyCount = tubes.members.filter(member => !shipmentPairIssue(member)).length
  const preparationReady = tubes.members.length > 0 && readyCount === tubes.members.length && tubes.members.length === batch.memberCount
  const schema = baseSchema.superRefine((values, ctx) => {
    const required = (key: keyof typeof values, label: string) => { if (!values[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${label} is required.` }) }
    if (kind === 'prepare' || kind === 'shipment') {
      if (kind === 'prepare') { required('vendorSupplierId', 'Vendor'); required('vendorProductId', 'Sequencing service'); required('vendorShipmentAddressId', 'Shipment address') }
      if (values.eta && !Number.isFinite(new Date(values.eta).getTime())) ctx.addIssue({ code: 'custom', path: ['eta'], message: 'Enter a valid ETA.' })
    }
    if (kind === 'reference') {
      required('label', 'Label'); required('storage', 'Storage location')
      if (/[?#]/.test(values.storage) || /^[a-z]+:\/\/[^/]*@/i.test(values.storage)) ctx.addIssue({ code: 'custom', path: ['storage'], message: 'Use a permanent location without credentials, query strings or fragments.' })
    }
    if (kind === 'outcome' || kind === 'shipment') required('evidence', 'Evidence or reason')
    if (kind === 'outcome' && (!values.occurredAt || !Number.isFinite(new Date(values.occurredAt).getTime()))) ctx.addIssue({ code: 'custom', path: ['occurredAt'], message: 'Record the actual decision time.' })
  })
  const form = useForm<z.infer<typeof baseSchema>>({ resolver: zodResolver(schema), defaultValues: { vendorSupplierId: '', vendorProductId: '', vendorShipmentAddressId: '', vendorSupplierVersion: 0, vendorProductVersion: 0, vendorShipmentAddressVersion: 0, carrier: sendout?.carrier ?? '', tracking: sendout?.trackingReference ?? '', providerReference: sendout?.providerReference ?? '', eta: sendout?.expectedCompletionAtUtc ? localTime(sendout.expectedCompletionAtUtc) : '', evidence: '', label: '', storage: '', memberId: '', outcome: 'Success', occurredAt: localTime(), exceptions: [] } })
  const canChangeAddress = kind === 'shipment' && batch.sendoutStatus === 'Preparing' && Boolean(sendout?.vendorSupplierId)
  const vendors = useQuery({ queryKey: ['lab-sequencing-vendors'], queryFn: getSequencingVendors, enabled: kind === 'prepare' || canChangeAddress })
  const exceptions = useFieldArray({ control: form.control, name: 'exceptions' })
  const outcome = form.watch('outcome')
  const opposite = outcome === 'Success' ? 'Failure' : 'Success'
  const save = useMutation({ mutationFn: async (values: z.infer<typeof baseSchema>) => {
    const shipment = { carrier: values.carrier || null, trackingReference: values.tracking || null, providerReference: values.providerReference || null, expectedCompletionAtUtc: values.eta ? new Date(values.eta).toISOString() : null }
    if (kind === 'prepare') {
      if (!preparationReady) throw new Error('Complete and review every sequencing tube pair before preparing the shipment.')
      return createLabSendout(batch.id, { ...shipment, batchVersion: batch.version, vendorSupplierId: values.vendorSupplierId, vendorProductId: values.vendorProductId, vendorShipmentAddressId: values.vendorShipmentAddressId, vendorSupplierVersion: values.vendorSupplierVersion, vendorProductVersion: values.vendorProductVersion, vendorShipmentAddressVersion: values.vendorShipmentAddressVersion, manifestJson: JSON.stringify({ notes: values.evidence || null }) })
    }
    if (!sendout || batch.sendoutVersion === null) throw new Error('Refresh the saved sendout before continuing.')
    if (kind === 'shipment') return updateVendorShipment(sendout.id, { ...shipment, version: batch.sendoutVersion, evidence: values.evidence, ...(values.vendorShipmentAddressId ? { vendorShipmentAddressId: values.vendorShipmentAddressId, vendorShipmentAddressVersion: values.vendorShipmentAddressVersion } : {}) })
    if (kind === 'reference') return addVendorResultReference(sendout.id, { requestId: requestId.current, version: batch.sendoutVersion, memberId: values.memberId || null, label: values.label, storageReference: values.storage, notes: values.evidence || null })
    return finalizeVendorOutcome(sendout.id, { requestId: requestId.current, version: batch.sendoutVersion, outcome: values.outcome, occurredAtUtc: new Date(values.occurredAt).toISOString(), evidence: values.evidence, exceptions: values.exceptions.map(e => ({ ...e, outcome: opposite })) })
  }, onSuccess: async () => { await onSaved(); onClose() } })
  const dismissal = useOrderDecisionDismissal(form.formState.isDirty, save.isPending, onClose, { scope: titles[kind].toLowerCase(), description: `Unsaved entries for ${batch.batchNumber} will be discarded. Its saved shipment, outcome and storage references will remain as recorded.` })
  const input = (key: 'carrier' | 'tracking' | 'providerReference' | 'eta' | 'label' | 'storage' | 'occurredAt', label: string, required = false, type = 'text', readOnly = false) => <PreparationField id={`vendor-${key}`} label={label} required={required} error={form.formState.errors[key]?.message}><Input id={`vendor-${key}`} {...operationalInputProps} type={type} step={type === 'datetime-local' ? '1' : undefined} readOnly={readOnly} {...form.register(key)} /></PreparationField>
  return <DialogReturnFocus target={null} fallbackId={`sequencing-batch-actions-${batch.id}`}><Dialog open onOpenChange={open => { if (!open) dismissal.close() }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus() }}><form className="contents" noValidate onSubmit={form.handleSubmit(values => save.mutate(values))}>
    <DialogHeader><DialogTitle>{titles[kind]}</DialogTitle><DialogDescription>Review the batch and enter the {kind === 'reference' ? 'external storage reference' : kind === 'outcome' ? 'vendor decision and library exceptions' : 'shipment details'} before saving.</DialogDescription></DialogHeader>
    <div className="space-y-4">
      <p className="break-words text-sm"><strong>{batch.batchNumber}</strong>{batch.name.trim() && batch.name.trim() !== batch.batchNumber ? ` · ${batch.name}` : ''} · {labCount(tubes.members.length, 'library', 'libraries')}</p>
      {kind === 'prepare' || kind === 'shipment' ? <>
        <p className="text-sm">{kind === 'prepare' ? 'Review every tube pair before saving. This freezes the library manifest; dispatch is recorded separately after physical shipment.' : 'Record tracking or ETA changes with evidence. The destination is fixed after dispatch.'}</p>
        {kind === 'prepare' ? <>
          {!preparationReady ? <p role="alert" className="text-sm text-destructive">Shipment preparation is blocked. {readyCount} of {batch.memberCount} tube pairs are ready. Close this dialog and use Actions → Sequencing tubes to complete the remaining pairs.</p> : null}
          <details open={!preparationReady} className="rounded-md border p-3"><summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Review tube manifest · {readyCount} of {batch.memberCount} ready</summary><ul className="mt-3 space-y-3 text-sm">{tubes.members.map(member => <li key={member.id} className="space-y-1 border-t pt-3"><p className="break-all font-medium">{member.source.barcode} → {member.sequencingTube?.barcode ?? 'Sequencing tube pending'}</p><p className="break-words">{member.libraryKey} · transferred {labAmount(member.transfer?.quantityText ?? member.transfer?.quantity)} {member.transfer?.quantityUnit} · minimum {labAmount(member.minimumSequencingVolumeUlText ?? member.minimumSequencingVolumeUl)} µL</p><p className={shipmentPairIssue(member) ? 'text-destructive' : 'text-muted-foreground'}>{shipmentPairIssue(member) ?? 'Ready for shipment'}</p></li>)}</ul></details>
        </> : null}
        {kind === 'shipment' && sendout ? <dl className="space-y-2 text-sm"><div><dt className="text-muted-foreground">Vendor and service</dt><dd className="break-words">{sendout.providerName}{sendout.vendorProductName ? ` · ${sendout.vendorProductName}` : ''}</dd></div><div><dt className="text-muted-foreground">Saved shipment address{sendout.vendorShipmentAddressLabel ? ` · ${sendout.vendorShipmentAddressLabel}` : ''}</dt><dd className="whitespace-pre-line break-words">{sendout.destination ?? 'Not recorded'}</dd></div></dl> : null}
        {kind === 'prepare' || canChangeAddress ? <>
          {vendors.isPending ? <p role="status">Loading sequencing vendors…</p> : null}
          {vendors.isError ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(vendors.error, 'Sequencing vendors could not be loaded.')} <button type="button" className="cursor-pointer underline" onClick={() => void vendors.refetch()}>Retry</button></p> : null}
          {vendors.data ? <VendorSelectionFields catalog={vendors.data} form={form} fixedVendorId={canChangeAddress ? sendout?.vendorSupplierId ?? undefined : undefined} busy={save.isPending} /> : null}
        </> : null}
        <div className="grid gap-4 sm:grid-cols-2">{input('carrier', 'Carrier (optional)')}{input('tracking', 'Tracking reference (optional)')}</div>
        <p className="text-xs text-muted-foreground">Carrier and tracking reference are required when marking Shipped.</p>
        {input('providerReference', 'Vendor reference (optional)')}{input('eta', 'Expected completion (optional)', false, 'datetime-local')}
      </> : null}
      {kind === 'reference' ? <>
        <p className="text-sm">Save the permanent location of a result file, folder or manifest. References remain unverified; scientific processing and release are separate.</p>
        {input('label', 'Reference label', true)}{input('storage', 'External storage location', true)}
        <PreparationField id="vendor-member" label="Library scope"><NativeSelect id="vendor-member" {...form.register('memberId')}><option value="">Whole batch</option>{tubes.members.map(m => <option key={m.id} value={m.id}>{m.libraryKey}{m.source.barcode !== m.libraryKey ? ` · ${m.source.barcode}` : ''}</option>)}</NativeSelect></PreparationField>
      </> : null}
      {kind === 'outcome' ? <>
        <p className="text-sm">The batch outcome applies to {labCount(tubes.members.length, 'library', 'libraries')} except the libraries selected below. Saving completes this batch and retains the decision and exceptions. Review them before saving.</p>
        <PreparationField id="vendor-outcome" label="Batch outcome" required><NativeSelect id="vendor-outcome" {...form.register('outcome')}><option value="Success">Success</option><option value="Failure">Failure</option></NativeSelect></PreparationField>
        {input('occurredAt', 'Actual decision time', true, 'datetime-local')}
        <fieldset className="space-y-3"><legend className="text-sm font-medium">Library exceptions · {opposite}</legend>{tubes.members.map(member => {
          const index = exceptions.fields.findIndex(e => e.memberId === member.id)
          return <div key={member.id} className="space-y-2 rounded-md border p-3"><label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" checked={index >= 0} onChange={event => event.target.checked ? exceptions.append({ memberId: member.id, reason: '' }) : exceptions.remove(index)} /><span className="min-w-0 break-words">{member.libraryKey}{member.source.barcode !== member.libraryKey ? ` · ${member.source.barcode}` : ''} — {index >= 0 ? opposite : outcome}</span></label>{index >= 0 ? <PreparationField id={`vendor-exception-${member.id}`} label={`${opposite} reason`} required error={form.formState.errors.exceptions?.[index]?.reason?.message}><textarea id={`vendor-exception-${member.id}`} className={`${prepSelectClass} min-h-20 py-2`} maxLength={4000} {...form.register(`exceptions.${index}.reason`)} /></PreparationField> : null}</div>
        })}</fieldset>
        <p className="text-sm text-muted-foreground">{labCount(tubes.members.length - exceptions.fields.length, 'library follows', 'libraries follow')} the batch outcome; {labCount(exceptions.fields.length, 'exception')}. Returned data, analysis and Customer release remain separate.</p>
      </> : null}
      <PreparationField id="vendor-evidence" label={kind === 'outcome' ? 'Vendor report and decision evidence' : kind === 'shipment' ? 'Update evidence or reason' : 'Notes (optional)'} required={kind === 'outcome' || kind === 'shipment'} error={form.formState.errors.evidence?.message}><textarea id="vendor-evidence" className={`${prepSelectClass} min-h-24 py-2`} maxLength={4000} {...form.register('evidence')} /></PreparationField>
      {save.error ? <div role="alert" className="space-y-1 text-sm text-destructive"><p>{getLabOperationsError(save.error, 'Refresh the batch and review the saved state before retrying.')}</p>{kind === 'prepare' || canChangeAddress ? <p>Close and reopen this dialog to review updated vendor and address details before retrying.</p> : null}</div> : null}
    </div>
    <RequiredDialogFooter><Button ref={cancel} type="button" variant="outline" disabled={save.isPending} onClick={dismissal.close}>Cancel</Button><Button type="submit" disabled={save.isPending || kind === 'prepare' && (!preparationReady || vendors.isPending || vendors.isError || !vendors.data?.some(vendor => vendor.shipmentAddresses.length))}>{save.isPending ? 'Saving…' : kind === 'outcome' ? `Record ${outcome.toLowerCase()} and complete batch` : kind === 'prepare' ? 'Prepare shipment' : kind === 'shipment' ? 'Save shipment changes' : 'Add storage reference'}</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>{dismissal.confirmation}</DialogReturnFocus>
}


type VendorValues = z.infer<typeof baseSchema>
export function VendorSelectionFields({ catalog, form, fixedVendorId, busy }: { catalog: SequencingVendor[]; form: UseFormReturn<VendorValues>; fixedVendorId?: string; busy: boolean }) {
  // Versions belong to the choices the operator reviewed, even if a background query refreshes.
  const [reviewed, setReviewed] = useState<SequencingVendor[] | null>(null)
  const choices = reviewed ?? catalog
  const vendorId = form.watch('vendorSupplierId')
  const productId = form.watch('vendorProductId')
  const addressId = form.watch('vendorShipmentAddressId')
  const vendor = choices.find(item => item.id === (fixedVendorId || vendorId))
  const product = vendor?.products.find(item => item.id === productId)
  const address = vendor?.shipmentAddresses.find(item => item.id === addressId)
  const errors = form.formState.errors
  return <>
    {!fixedVendorId ? <>
      <PreparationField id="vendor-supplier" label="Vendor" required error={errors.vendorSupplierId?.message}><NativeSelect id="vendor-supplier" disabled={busy || !choices.length} value={vendorId} onChange={event => {
        setReviewed(event.target.value ? choices : null)
        const selected = choices.find(item => item.id === event.target.value)
        form.setValue('vendorSupplierId', event.target.value, { shouldDirty: true, shouldValidate: true })
        form.setValue('vendorSupplierVersion', selected?.version ?? 0)
        form.setValue('vendorProductId', '', { shouldDirty: true }); form.setValue('vendorProductVersion', 0)
        form.setValue('vendorShipmentAddressId', '', { shouldDirty: true }); form.setValue('vendorShipmentAddressVersion', 0)
      }}><option value="">Select a sequencing vendor</option>{choices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></PreparationField>
      {!choices.length ? <p className="text-sm">No sequencing vendors are ready. A Purchasing administrator must add a supplier, an active shipment address and an active Sequencing service product under Purchasing → Suppliers.</p> : null}
      <PreparationField id="vendor-service" label="Sequencing service" required error={errors.vendorProductId?.message}><NativeSelect id="vendor-service" disabled={busy || !vendor} value={productId} onChange={event => {
        form.setValue('vendorProductId', event.target.value, { shouldDirty: true, shouldValidate: true })
        form.setValue('vendorProductVersion', vendor?.products.find(item => item.id === event.target.value)?.version ?? 0)
      }}><option value="">Select a sequencing service</option>{vendor?.products.map(item => <option key={item.id} value={item.id}>{item.productNumber}</option>)}</NativeSelect>{product ? <p className="break-words text-xs text-muted-foreground">{product.description}</p> : null}</PreparationField>
    </> : null}
    <PreparationField id="vendor-address" label={fixedVendorId ? 'Change shipment address (optional)' : 'Shipment address'} required={!fixedVendorId} error={errors.vendorShipmentAddressId?.message}><NativeSelect id="vendor-address" disabled={busy || !vendor?.shipmentAddresses.length} value={addressId} onChange={event => {
      if (fixedVendorId) setReviewed(event.target.value ? choices : null)
      form.setValue('vendorShipmentAddressId', event.target.value, { shouldDirty: true, shouldValidate: true })
      form.setValue('vendorShipmentAddressVersion', vendor?.shipmentAddresses.find(item => item.id === event.target.value)?.version ?? 0)
    }}><option value="">{fixedVendorId ? 'Keep saved shipment address' : 'Select a shipment address'}</option>{vendor?.shipmentAddresses.map(item => <option key={item.id} value={item.id}>{item.label} · {item.city} · {item.countryCode}</option>)}</NativeSelect></PreparationField>
    {vendor && !vendor.shipmentAddresses.length ? <p className="text-sm">This vendor needs an active shipment address in Purchasing.</p> : null}
    {address ? <div className="rounded-md border bg-muted/30 p-3 text-sm"><p className="font-medium">{fixedVendorId ? 'New destination to review' : 'Destination to review'} · {address.label}</p><p className="mt-2 whitespace-pre-line break-words">{address.destination}</p></div> : null}
  </>
}
