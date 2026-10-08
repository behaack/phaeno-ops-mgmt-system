import { useRef, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { getSequencingVendors, type SequencingVendor, createLabSendout, getLabOperationsError, updateVendorShipment, type LabBatchDetail } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogReturnFocus } from '#/components/ui/dialog'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { useOrderDecisionDismissal } from '#/features/orders/use-order-decision-dismissal'
import { PreparationField, prepSelectClass } from './preparation-ui'
import { labAmount, labCount, operationalInputProps } from './lab-presentation'
import { shipmentPairIssue } from './vendor-workflow'

export type VendorDialogKind = 'prepare' | 'shipment'
const localTime = (value?: string | null) => { const t = value ? new Date(value) : new Date(); return new Date(t.getTime() - t.getTimezoneOffset() * 60_000).toISOString().slice(0, 19) }
const titles = { prepare: 'Prepare vendor shipment', shipment: 'Update shipment and ETA' }
const baseSchema = z.object({ vendorSupplierId: z.string(), vendorProductId: z.string(), vendorShipmentAddressId: z.string(), vendorSupplierVersion: z.number(), vendorProductVersion: z.number(), vendorShipmentAddressVersion: z.number(), carrier: z.string().trim().max(255), tracking: z.string().trim().max(255), providerReference: z.string().trim().max(255), eta: z.string(), evidence: z.string().trim().max(4000) })
export function VendorBatchDialog({ kind, workspace, onClose, onSaved }: { kind: VendorDialogKind; workspace: LabBatchDetail; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const cancel = useRef<HTMLButtonElement>(null)
  const reviewed = useRef(workspace).current
  const { batch, sendout, tubes } = reviewed
  const readyCount = tubes.members.filter(member => !shipmentPairIssue(member)).length
  const preparationReady = tubes.members.length > 0 && readyCount === tubes.members.length && tubes.members.length === batch.memberCount
  const schema = baseSchema.superRefine((v, ctx) => {
    if (kind === 'prepare') for (const key of ['vendorSupplierId', 'vendorProductId', 'vendorShipmentAddressId'] as const) if (!v[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'Choose the vendor, service and shipment address.' })
    if (v.eta && !Number.isFinite(new Date(v.eta).getTime())) ctx.addIssue({ code: 'custom', path: ['eta'], message: 'Enter a valid ETA.' })
    if (kind === 'shipment' && !v.evidence) ctx.addIssue({ code: 'custom', path: ['evidence'], message: 'Record the update evidence or reason.' })
  })
  const form = useForm<z.infer<typeof baseSchema>>({ resolver: zodResolver(schema), defaultValues: { vendorSupplierId: '', vendorProductId: '', vendorShipmentAddressId: '', vendorSupplierVersion: 0, vendorProductVersion: 0, vendorShipmentAddressVersion: 0, carrier: sendout?.carrier ?? '', tracking: sendout?.trackingReference ?? '', providerReference: sendout?.providerReference ?? '', eta: sendout?.expectedCompletionAtUtc ? localTime(sendout.expectedCompletionAtUtc) : '', evidence: '' } })
  const canChangeAddress = kind === 'shipment' && batch.sendoutStatus === 'Preparing' && Boolean(sendout?.vendorSupplierId)
  const vendors = useQuery({ queryKey: ['lab-sequencing-vendors'], queryFn: getSequencingVendors, enabled: kind === 'prepare' || canChangeAddress })
  const save = useMutation({ mutationFn: (v: z.infer<typeof baseSchema>) => {
    const shipment = { carrier: v.carrier || null, trackingReference: v.tracking || null, providerReference: v.providerReference || null, expectedCompletionAtUtc: v.eta ? new Date(v.eta).toISOString() : null }
    if (kind === 'prepare') {
      if (!preparationReady) throw new Error('Complete and review every sequencing tube pair before preparing the shipment.')
      return createLabSendout(batch.id, { ...shipment, batchVersion: batch.version, vendorSupplierId: v.vendorSupplierId, vendorProductId: v.vendorProductId, vendorShipmentAddressId: v.vendorShipmentAddressId, vendorSupplierVersion: v.vendorSupplierVersion, vendorProductVersion: v.vendorProductVersion, vendorShipmentAddressVersion: v.vendorShipmentAddressVersion, manifestJson: JSON.stringify({ notes: v.evidence || null }) })
    }
    if (!sendout || batch.sendoutVersion === null) throw new Error('Refresh the saved sendout before continuing.')
    return updateVendorShipment(sendout.id, { ...shipment, version: batch.sendoutVersion, evidence: v.evidence, ...(v.vendorShipmentAddressId ? { vendorShipmentAddressId: v.vendorShipmentAddressId, vendorShipmentAddressVersion: v.vendorShipmentAddressVersion } : {}) })
  }, onSuccess: async () => { await onSaved(); onClose() } })
  const dismissal = useOrderDecisionDismissal(form.formState.isDirty, save.isPending, onClose, { scope: titles[kind].toLowerCase(), description: `Unsaved entries for ${batch.batchNumber} will be discarded. Saved shipment details will remain unchanged.` })
  const input = (key: 'carrier' | 'tracking' | 'providerReference' | 'eta', label: string, type = 'text') => <PreparationField id={`vendor-${key}`} label={label} error={form.formState.errors[key]?.message}><Input id={`vendor-${key}`} {...operationalInputProps} type={type} step={type === 'datetime-local' ? '1' : undefined} disabled={save.isPending} {...form.register(key)} /></PreparationField>
  return <DialogReturnFocus target={null} fallbackId={`sequencing-batch-actions-${batch.id}`}><Dialog open onOpenChange={open => !open && dismissal.close()}><DialogContent onOpenAutoFocus={e => { e.preventDefault(); cancel.current?.focus() }}><form className="contents" noValidate onSubmit={form.handleSubmit(v => save.mutate(v))}>
    <DialogHeader><DialogTitle>{titles[kind]}</DialogTitle><DialogDescription>Review the batch and shipment details before saving.</DialogDescription></DialogHeader>
    <div className="space-y-4"><p className="text-sm"><strong>{batch.batchNumber}</strong> · {labCount(tubes.members.length, 'library', 'libraries')}</p>
      <p className="text-sm">{kind === 'prepare' ? 'This freezes the reviewed tube manifest. Physical dispatch is recorded separately.' : 'Retain tracking and ETA changes with their evidence. The destination is fixed after dispatch.'}</p>
      {kind === 'prepare' && !preparationReady ? <p role="alert" className="text-sm text-destructive">Shipment preparation is blocked. {readyCount} of {batch.memberCount} tube pairs are ready. Use Actions → Prepare sequencing tubes.</p> : null}
      {kind === 'prepare' ? <details open={!preparationReady} className="rounded-md border p-3"><summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Review tube manifest · {readyCount} of {batch.memberCount} ready</summary><ul className="mt-3 space-y-3 text-sm">{tubes.members.map(member => <li key={member.id} className="space-y-1 border-t pt-3"><p className="break-all font-medium">{member.source.barcode} → {member.sequencingTube?.barcode ?? 'Sequencing tube pending'}</p><p className="break-words">{member.libraryKey} · transferred {labAmount(member.transfer?.quantityText ?? member.transfer?.quantity)} {member.transfer?.quantityUnit} · minimum {labAmount(member.minimumSequencingVolumeUlText ?? member.minimumSequencingVolumeUl)} µL</p><p className={shipmentPairIssue(member) ? 'text-destructive' : 'text-muted-foreground'}>{shipmentPairIssue(member) ?? 'Ready for shipment'}</p></li>)}</ul></details> : null}
      {kind === 'shipment' && sendout ? <dl className="space-y-2 text-sm"><div><dt className="text-muted-foreground">Vendor and service</dt><dd className="break-words">{sendout.providerName}{sendout.vendorProductName ? ` · ${sendout.vendorProductName}` : ''}</dd></div><div><dt className="text-muted-foreground">Saved shipment address{sendout.vendorShipmentAddressLabel ? ` · ${sendout.vendorShipmentAddressLabel}` : ''}</dt><dd className="whitespace-pre-line break-words">{sendout.destination ?? 'Not recorded'}</dd></div></dl> : null}
      {kind === 'prepare' || canChangeAddress ? <>{vendors.isPending ? <p role="status">Loading sequencing vendors…</p> : null}{vendors.isError ? <p role="alert">{getLabOperationsError(vendors.error, 'Sequencing vendors could not be loaded.')} <button type="button" className="cursor-pointer underline" onClick={() => void vendors.refetch()}>Retry</button></p> : null}{vendors.data ? <VendorSelectionFields catalog={vendors.data} form={form} fixedVendorId={canChangeAddress ? sendout?.vendorSupplierId ?? undefined : undefined} busy={save.isPending} /> : null}</> : null}
      <div className="grid gap-3 sm:grid-cols-2">{input('carrier', 'Carrier (optional)')}{input('tracking', 'Tracking reference (optional)')}</div>
      <p className="text-xs text-muted-foreground">Carrier and tracking reference are required when marking Shipped.</p>
      {input('providerReference', 'Vendor reference (optional)')}{input('eta', 'Expected completion (optional)', 'datetime-local')}
      <PreparationField id="vendor-evidence" label={kind === 'shipment' ? 'Update evidence or reason' : 'Notes (optional)'} required={kind === 'shipment'} error={form.formState.errors.evidence?.message}><textarea id="vendor-evidence" className={`${prepSelectClass} min-h-20 py-2`} {...form.register('evidence')} /></PreparationField>
      {save.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(save.error, 'Refresh the batch and review the saved state before retrying.')}</p> : null}
    </div>
    <RequiredDialogFooter><Button ref={cancel} type="button" variant="outline" disabled={save.isPending} onClick={dismissal.close}>Cancel</Button><Button type="submit" disabled={save.isPending || kind === 'prepare' && (!preparationReady || vendors.isPending || vendors.isError || !vendors.data?.some(v => v.shipmentAddresses.length))}>{save.isPending ? 'Saving…' : kind === 'prepare' ? 'Prepare shipment' : 'Save shipment changes'}</Button></RequiredDialogFooter>
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
