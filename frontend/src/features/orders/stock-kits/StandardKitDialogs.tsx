import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage } from '#/api/order-management'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import { createShippingStockKit, dispatchShippingStockKit, registerShippingStockKitTubes, type ShippingContainerDefinition, type ShippingStockKit } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '../use-order-draft-guard'
import { containerEffectiveState, localContainerDateTime } from '../configuration/shipping-container-utils'

const selectClass = 'h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
const prepareSchema = z.object({ containerDefinitionId: z.string().uuid('Choose an active container size.'), tubeSupplierName: z.string().trim().min(1, 'Enter the tube supplier.').max(255), tubeProductNumber: z.string().trim().min(1, 'Enter the tube product number.').max(100), tubeLotNumber: z.string().trim().max(100), shipperSupplierName: z.string().trim().min(1, 'Enter the shipper supplier.').max(255), shipperProductNumber: z.string().trim().min(1, 'Enter the shipper product number.').max(100) })
type PrepareValues = z.infer<typeof prepareSchema>
type EditorProps = { onClose: () => void; onSaved: (kit: ShippingStockKit) => void | Promise<void> }

export function PrepareStandardKitDialog({ definitions, onClose, onSaved }: EditorProps & { definitions: ShippingContainerDefinition[] }) {
  const form = useForm<PrepareValues>({ resolver: zodResolver(prepareSchema), defaultValues: { containerDefinitionId: '', tubeSupplierName: '', tubeProductNumber: '', tubeLotNumber: '', shipperSupplierName: '', shipperProductNumber: '' } })
  const candidates = definitions.filter(value => containerEffectiveState(value) === 'Active now')
  const selected = candidates.find(value => value.id === form.watch('containerDefinitionId'))
  const mutation = useMutation({ mutationFn: (values: PrepareValues) => createShippingStockKit({ ...values, tubeLotNumber: values.tubeLotNumber || null }), onSuccess: async kit => { form.reset(form.getValues()); allowSavedNavigation(); await onSaved(kit) } })
  const dirty = form.formState.isDirty
  const allowSavedNavigation = useOrderDraftGuard(dirty, mutation.isPending)
  function close() { if (!mutation.isPending && (!dirty || window.confirm('Discard the unsaved standard-kit details?'))) onClose() }
  const errors = form.formState.errors
  function field(name: Exclude<keyof PrepareValues, 'containerDefinitionId'>, label: string, required = true) { return <StockKitField id={`stock-${name}`} label={label} required={required} error={errors[name]?.message}><Input id={`stock-${name}`} disabled={mutation.isPending} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `stock-${name}-error` : undefined} {...form.register(name)} /></StockKitField> }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Prepare standard kit</DialogTitle><DialogDescription>Choose a configured size, record the actual products, then register its permanent tube barcodes. Prepare stock before assigning a Customer Job.</DialogDescription></DialogHeader><StockKitSaveError error={mutation.error} />
    <form id="prepare-standard-kit" className="space-y-4" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}>
      <StockKitField id="stock-container" label="Container size" required error={errors.containerDefinitionId?.message}><select id="stock-container" className={selectClass} {...form.register('containerDefinitionId')} disabled={mutation.isPending} aria-invalid={Boolean(errors.containerDefinitionId)} aria-describedby={errors.containerDefinitionId ? 'stock-container-error' : undefined} onChange={event => { const definition = candidates.find(value => value.id === event.target.value); form.setValue('containerDefinitionId', event.target.value, { shouldDirty: true, shouldValidate: true }); form.setValue('shipperSupplierName', definition?.supplierName ?? '', { shouldDirty: true }); form.setValue('shipperProductNumber', definition?.supplierProductNumber ?? '', { shouldDirty: true }) }}><option value="">Select a configured size</option>{candidates.map(value => <option key={value.id} value={value.id}>{value.commonName} · SKU {value.sku} · {value.tubeCapacity} tubes</option>)}</select></StockKitField>
      {!candidates.length ? <p className="text-sm text-muted-foreground">Activate an approved container size in Order configuration → Sample shipping before preparing stock.</p> : null}
      {selected ? <p className="rounded-md border bg-muted/40 p-3 text-sm">This kit holds {selected.tubeCapacity} tubes. Register all {selected.tubeCapacity} before recording outbound dispatch.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">{field('tubeSupplierName', 'Tube supplier')}{field('tubeProductNumber', 'Tube product number')}{field('tubeLotNumber', 'Tube lot', false)}{field('shipperSupplierName', 'Shipper supplier')}{field('shipperProductNumber', 'Shipper product number')}</div>
    </form><RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="prepare-standard-kit" disabled={mutation.isPending || !candidates.length}>{mutation.isPending ? 'Preparing…' : 'Prepare standard kit'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

export function RegisterStockKitTubesDialog({ kit, onClose, onSaved }: EditorProps & { kit: ShippingStockKit }) {
  const remaining = kit.container.capacity - kit.tubes.length
  const schema = z.object({ barcodes: z.string().trim().min(1, 'Scan at least one permanent tube barcode.') }).superRefine((values, context) => {
    const codes = barcodeLines(values.barcodes), normalized = codes.map(value => value.toUpperCase())
    if (codes.length > remaining) context.addIssue({ code: 'custom', path: ['barcodes'], message: `Only ${remaining} more tubes fit in this kit.` })
    else if (new Set(normalized).size !== codes.length) context.addIssue({ code: 'custom', path: ['barcodes'], message: 'A barcode appears more than once. Scan each physical tube once.' })
    else if (normalized.some(value => kit.tubes.some(tube => tube.supplierBarcode.toUpperCase() === value))) context.addIssue({ code: 'custom', path: ['barcodes'], message: 'One of these tubes is already registered to this kit.' })
  })
  const form = useForm<{ barcodes: string }>({ resolver: zodResolver(schema), defaultValues: { barcodes: '' } })
  const mutation = useMutation({ mutationFn: (values: { barcodes: string }) => registerShippingStockKitTubes(kit.id, { version: kit.version, supplierBarcodes: barcodeLines(values.barcodes) }), onSuccess: async value => { form.reset(); await onSaved(value) } })
  const dirty = form.formState.isDirty
  useOrderDraftGuard(dirty, mutation.isPending)
  function close() { if (!mutation.isPending && (!dirty || window.confirm('Discard the unregistered tube scans?'))) onClose() }
  const error = form.formState.errors.barcodes?.message
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><DialogHeader><DialogTitle>Register kit tubes</DialogTitle><DialogDescription>{kit.kitNumber} · {kit.container.commonName} · SKU {kit.container.sku}. {remaining} more {remaining === 1 ? 'tube is' : 'tubes are'} required.</DialogDescription></DialogHeader><StockKitSaveError error={mutation.error} />
    <form id="register-stock-kit-tubes" className="space-y-3" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}><StockKitField id="stock-tube-barcodes" label="Permanent tube barcodes" required error={error}><Textarea id="stock-tube-barcodes" rows={7} className="font-mono" autoComplete="off" spellCheck={false} disabled={mutation.isPending} aria-invalid={Boolean(error)} aria-describedby={`stock-tube-barcodes-help${error ? ' stock-tube-barcodes-error' : ''}`} {...form.register('barcodes')} /></StockKitField><p id="stock-tube-barcodes-help" className="text-xs text-muted-foreground">Scan one tube per line. Saving registers these physical tubes to this kit.</p></form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="register-stock-kit-tubes" disabled={mutation.isPending || remaining <= 0}>{mutation.isPending ? 'Registering…' : 'Register tubes'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

const dispatchSchema = z.object({ shipmentId: z.string().uuid('Select the Customer Job receiving this kit.'), outboundCarrier: z.string().trim().min(1, 'Enter the carrier.').max(255), outboundTrackingNumber: z.string().trim().min(1, 'Enter the tracking number.').max(255), fulfilledAt: z.string().min(1, 'Enter the dispatch time.').refine(value => Number.isFinite(new Date(value).getTime()), 'Enter a valid dispatch time.') })
type DispatchValues = z.infer<typeof dispatchSchema>
export function DispatchStandardKitDialog({ kit, shipments, initialShipmentId, onClose, onSaved }: EditorProps & { kit: ShippingStockKit; shipments: SampleShipmentWorkflow[]; initialShipmentId?: string }) {
  const jobs = new Map<string, SampleShipmentWorkflow>()
  for (const shipment of shipments.filter(value => ['Preparing', 'ReadyToShip'].includes(value.status))) if (!jobs.has(shipment.authorizationSourceId) || shipment.id === initialShipmentId) jobs.set(shipment.authorizationSourceId, shipment)
  const form = useForm<DispatchValues>({ resolver: zodResolver(dispatchSchema), defaultValues: { shipmentId: [...jobs.values()].some(value => value.id === initialShipmentId) ? initialShipmentId! : '', outboundCarrier: '', outboundTrackingNumber: '', fulfilledAt: localContainerDateTime() } })
  const mutation = useMutation({ mutationFn: (values: DispatchValues) => dispatchShippingStockKit(kit.id, { ...values, version: kit.version, fulfilledAt: new Date(values.fulfilledAt).toISOString() }), onSuccess: async value => { form.reset(form.getValues()); await onSaved(value) } })
  const dirty = form.formState.isDirty
  useOrderDraftGuard(dirty, mutation.isPending)
  function close() { if (!mutation.isPending && (!dirty || window.confirm('Discard the unrecorded kit-dispatch details?'))) onClose() }
  const errors = form.formState.errors
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><DialogHeader><DialogTitle>Record kit dispatch</DialogTitle><DialogDescription>{kit.kitNumber} · {kit.container.commonName} · SKU {kit.container.sku}. Record sending this registered kit to the selected Customer Job.</DialogDescription></DialogHeader><StockKitSaveError error={mutation.error} />
    <form id="dispatch-standard-kit" className="space-y-4" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}>
      <StockKitField id="stock-dispatch-job" label="Customer Job" required error={errors.shipmentId?.message}><select id="stock-dispatch-job" className={selectClass} disabled={mutation.isPending} aria-invalid={Boolean(errors.shipmentId)} aria-describedby={errors.shipmentId ? 'stock-dispatch-job-error' : undefined} {...form.register('shipmentId')}><option value="">Select a Job</option>{[...jobs.values()].map(value => <option key={value.id} value={value.id}>{value.organizationName} · {value.authorizationReference}</option>)}</select></StockKitField>
      {!jobs.size ? <p className="text-sm text-muted-foreground">No active sample-shipping Jobs are available for dispatch.</p> : null}<p className="text-sm">{kit.tubes.length} registered tubes · {kit.container.capacity} tube capacity</p>
      {(['outboundCarrier', 'outboundTrackingNumber', 'fulfilledAt'] as const).map((name, index) => <StockKitField key={name} id={`stock-dispatch-${name}`} label={['Carrier', 'Tracking number', 'Dispatched at'][index]} required error={errors[name]?.message}><Input id={`stock-dispatch-${name}`} type={name === 'fulfilledAt' ? 'datetime-local' : 'text'} disabled={mutation.isPending} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `stock-dispatch-${name}-error` : undefined} {...form.register(name)} /></StockKitField>)}
    </form><RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="dispatch-standard-kit" disabled={mutation.isPending || !jobs.size || kit.tubes.length !== kit.container.capacity}>{mutation.isPending ? 'Recording…' : 'Record dispatch'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
function barcodeLines(value: string) { return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean) }
function StockKitField({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode }) { return <div><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label><div className="mt-2">{children}</div>{error ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">{error}</p> : null}</div> }
function StockKitSaveError({ error }: { error: unknown }) { return error ? <Alert variant="destructive"><AlertTitle>Kit changes were not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Review the current kit and try again. Your entries are retained.')}</AlertDescription></Alert> : null }
StockKitSaveError.dialogRegion = 'feedback' as const
