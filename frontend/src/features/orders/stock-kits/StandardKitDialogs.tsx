import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useSupplierCatalog, type SupplierProductKind } from '#/api/supplier-catalog'
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
const prepareSchema = z.object({ containerDefinitionId: z.string().uuid('Choose an active container size.'), tubeSupplierId: z.string().uuid('Choose a tube supplier.'), tubeSupplierProductId: z.string().uuid('Choose a tube product.'), tubeLotNumber: z.string().trim().max(100), shipperSupplierId: z.string().uuid('Choose a shipping container supplier.'), shipperSupplierProductId: z.string().uuid('Choose a shipping container product.') })
type PrepareValues = z.infer<typeof prepareSchema>
type EditorProps = { onClose: () => void; onSaved: (kit: ShippingStockKit) => void | Promise<void> }

export function PrepareStandardKitDialog({ definitions, onClose, onSaved }: EditorProps & { definitions: ShippingContainerDefinition[] }) {
  const catalog = useSupplierCatalog()
  const suppliers = (catalog.data ?? []).filter(supplier => supplier.isActive)
  const form = useForm<PrepareValues>({ resolver: zodResolver(prepareSchema), defaultValues: { containerDefinitionId: '', tubeSupplierId: '', tubeSupplierProductId: '', tubeLotNumber: '', shipperSupplierId: '', shipperSupplierProductId: '' } })
  const candidates = definitions.filter(value => containerEffectiveState(value) === 'Active now')
  const selected = candidates.find(value => value.id === form.watch('containerDefinitionId'))
  const mutation = useMutation({ mutationFn: (values: PrepareValues) => createShippingStockKit({ containerDefinitionId: values.containerDefinitionId, tubeSupplierProductId: values.tubeSupplierProductId, shipperSupplierProductId: values.shipperSupplierProductId, tubeLotNumber: values.tubeLotNumber || null }), onSuccess: async kit => { form.reset(form.getValues()); allowSavedNavigation(); await onSaved(kit) } })
  const dirty = form.formState.isDirty
  const allowSavedNavigation = useOrderDraftGuard(dirty, mutation.isPending)
  function close() { if (!mutation.isPending && (!dirty || window.confirm('Discard the unsaved standard-kit details?'))) onClose() }
  const errors = form.formState.errors
  const unavailable = mutation.isPending || catalog.isPending || catalog.isError
  const values = form.watch()
  function productFields(prefix: 'tube' | 'shipper', kind: SupplierProductKind) {
    const supplierField = `${prefix}SupplierId` as const
    const productField = `${prefix}SupplierProductId` as const
    const supplier = suppliers.find(item => item.id === values[supplierField])
    const products = supplier?.products.filter(item => item.isActive && item.productTypeIsActive && item.kind === kind) ?? []
    return <>
      <StockKitField id={`stock-${supplierField}`} label="Supplier" required error={errors[supplierField]?.message}><select id={`stock-${supplierField}`} className={selectClass} disabled={unavailable} aria-invalid={Boolean(errors[supplierField])} aria-describedby={errors[supplierField] ? `stock-${supplierField}-error` : undefined} {...form.register(supplierField)} onChange={event => { form.setValue(supplierField, event.target.value, { shouldDirty: true, shouldValidate: true }); form.setValue(productField, '', { shouldDirty: true, shouldValidate: true }) }}><option value="">Select supplier</option>{suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></StockKitField>
      <StockKitField id={`stock-${productField}`} label="Product name" required error={errors[productField]?.message}><select id={`stock-${productField}`} className={selectClass} disabled={unavailable || !supplier || !products.length} aria-invalid={Boolean(errors[productField])} aria-describedby={errors[productField] ? `stock-${productField}-error` : undefined} {...form.register(productField)} value={values[productField]} onChange={event => form.setValue(productField, event.target.value, { shouldDirty: true, shouldValidate: true })}><option value="">{supplier && !products.length ? 'No active products of this type' : 'Select product'}</option>{products.map(item => <option key={item.id} value={item.id}>{item.productNumber} — {item.description}</option>)}</select></StockKitField>
    </>
  }
  function submit(values: PrepareValues) {
    for (const [prefix, kind] of [['tube', 'Tube'], ['shipper', 'ShippingContainer']] as const) {
      const supplier = suppliers.find(item => item.id === values[`${prefix}SupplierId`])
      if (!supplier?.products.some(item => item.id === values[`${prefix}SupplierProductId`] && item.isActive && item.productTypeIsActive && item.kind === kind)) {
        form.setError(`${prefix}SupplierProductId`, { message: 'Choose an active product from this supplier.' }); return
      }
    }
    if (!unavailable) mutation.mutate(values)
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Prepare standard kit</DialogTitle><DialogDescription>Choose a configured size and the actual supplier products, then register its permanent tube barcodes. Prepared stock remains at Phaeno until dispatch.</DialogDescription></DialogHeader><StockKitSaveError error={mutation.error || catalog.error} />
    <form id="prepare-standard-kit" className="space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
      {catalog.isPending ? <p role="status">Loading suppliers and products…</p> : null}
      {catalog.isError ? <Button type="button" variant="outline" onClick={() => void catalog.refetch()}>Retry catalog</Button> : null}
      <StockKitField id="stock-container" label="Container size" required error={errors.containerDefinitionId?.message}><select id="stock-container" className={selectClass} {...form.register('containerDefinitionId')} disabled={unavailable} aria-invalid={Boolean(errors.containerDefinitionId)} aria-describedby={errors.containerDefinitionId ? 'stock-container-error' : undefined} onChange={event => {
        const definition = candidates.find(value => value.id === event.target.value)
        const supplier = suppliers.find(item => item.name.trim().toUpperCase() === definition?.supplierName?.trim().toUpperCase())
        const product = supplier?.products.find(item => item.isActive && item.productTypeIsActive && item.kind === 'ShippingContainer' && item.productNumber.trim().toUpperCase() === definition?.supplierProductNumber?.trim().toUpperCase())
        form.setValue('containerDefinitionId', event.target.value, { shouldDirty: true, shouldValidate: true })
        form.setValue('shipperSupplierId', supplier?.id ?? '', { shouldDirty: true, shouldValidate: true })
        form.setValue('shipperSupplierProductId', product?.id ?? '', { shouldDirty: true, shouldValidate: true })
      }}><option value="">Select a configured size</option>{candidates.map(value => <option key={value.id} value={value.id}>{value.commonName} · SKU {value.sku} · {value.tubeCapacity} tubes</option>)}</select></StockKitField>
      {!candidates.length ? <p className="text-sm text-muted-foreground">Activate an approved container size in Order Settings → Sample shipping before preparing stock.</p> : null}
      {selected ? <p className="rounded-md border bg-muted/40 p-3 text-sm">This kit holds {selected.tubeCapacity} tubes. Register all {selected.tubeCapacity} before recording outbound dispatch.</p> : null}
      <fieldset className="min-w-0"><legend className="mb-3 text-sm font-medium">Tubes</legend><div className="grid gap-4">{productFields('tube', 'Tube')}<StockKitField id="stock-tubeLotNumber" label="Lot" error={errors.tubeLotNumber?.message}><Input id="stock-tubeLotNumber" disabled={mutation.isPending} aria-invalid={Boolean(errors.tubeLotNumber)} aria-describedby={errors.tubeLotNumber ? 'stock-tubeLotNumber-error' : undefined} {...form.register('tubeLotNumber')} /></StockKitField></div></fieldset>
      <fieldset className="min-w-0"><legend className="mb-3 text-sm font-medium">Shipping Container</legend><div className="grid gap-4">{productFields('shipper', 'ShippingContainer')}</div></fieldset>
      <p className="text-sm text-muted-foreground">Missing a supplier or product? Add it in <Link className="text-primary underline" to="/lab-operations" search={{ section: 'suppliers' }}>Suppliers &amp; Products</Link>, then return to prepare the kit.</p>
    </form><RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="prepare-standard-kit" disabled={unavailable || !candidates.length || !suppliers.length}>{mutation.isPending ? 'Preparing…' : 'Prepare standard kit'}</Button></RequiredDialogFooter>
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

const dispatchSchema = z.object({ shipmentId: z.string().uuid('Select the Trial or Partner shipment receiving this kit.'), outboundCarrier: z.string().trim().min(1, 'Enter the carrier.').max(255), outboundTrackingNumber: z.string().trim().min(1, 'Enter the tracking number.').max(255), fulfilledAt: z.string().min(1, 'Enter the dispatch time.').refine(value => Number.isFinite(new Date(value).getTime()), 'Enter a valid dispatch time.') })
type DispatchValues = z.infer<typeof dispatchSchema>
export function DispatchStandardKitDialog({ kit, shipments, initialShipmentId, onClose, onSaved }: EditorProps & { kit: ShippingStockKit; shipments: SampleShipmentWorkflow[]; initialShipmentId?: string }) {
  const jobs = new Map<string, SampleShipmentWorkflow>()
  for (const shipment of shipments.filter(value => (value.authorizationSource !== 'CustomerLabServiceOrder' || value.organizationKind === 'Partner') && ['Preparing', 'ReadyToShip'].includes(value.status))) if (!jobs.has(shipment.authorizationSourceId) || shipment.id === initialShipmentId) jobs.set(shipment.authorizationSourceId, shipment)
  const form = useForm<DispatchValues>({ resolver: zodResolver(dispatchSchema), defaultValues: { shipmentId: [...jobs.values()].some(value => value.id === initialShipmentId) ? initialShipmentId! : '', outboundCarrier: '', outboundTrackingNumber: '', fulfilledAt: localContainerDateTime() } })
  const mutation = useMutation({ mutationFn: (values: DispatchValues) => dispatchShippingStockKit(kit.id, { ...values, version: kit.version, fulfilledAt: new Date(values.fulfilledAt).toISOString() }), onSuccess: async value => { form.reset(form.getValues()); await onSaved(value) } })
  const dirty = form.formState.isDirty
  useOrderDraftGuard(dirty, mutation.isPending)
  function close() { if (!mutation.isPending && (!dirty || window.confirm('Discard the unrecorded kit-dispatch details?'))) onClose() }
  const errors = form.formState.errors
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><DialogHeader><DialogTitle>Record Trial or Partner dispatch</DialogTitle><DialogDescription>{kit.kitNumber} · {kit.container.commonName} · SKU {kit.container.sku}. This preserves the existing Trial and Partner supply workflow. Use Customer kit requests for Customer location deliveries.</DialogDescription></DialogHeader><StockKitSaveError error={mutation.error} />
    <form id="dispatch-standard-kit" className="space-y-4" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}>
      <StockKitField id="stock-dispatch-job" label="Trial or Partner shipment" required error={errors.shipmentId?.message}><select id="stock-dispatch-job" className={selectClass} disabled={mutation.isPending} aria-invalid={Boolean(errors.shipmentId)} aria-describedby={errors.shipmentId ? 'stock-dispatch-job-error' : undefined} {...form.register('shipmentId')}><option value="">Select a shipment</option>{[...jobs.values()].map(value => <option key={value.id} value={value.id}>{value.organizationName} · {value.authorizationReference}</option>)}</select></StockKitField>
      {!jobs.size ? <p className="text-sm text-muted-foreground">No active Trial or Partner shipments are available for dispatch.</p> : null}<p className="text-sm">{kit.tubes.length} registered tubes · {kit.container.capacity} tube capacity</p>
      {(['outboundCarrier', 'outboundTrackingNumber', 'fulfilledAt'] as const).map((name, index) => <StockKitField key={name} id={`stock-dispatch-${name}`} label={['Carrier', 'Tracking number', 'Dispatched at'][index]} required error={errors[name]?.message}><Input id={`stock-dispatch-${name}`} type={name === 'fulfilledAt' ? 'datetime-local' : 'text'} disabled={mutation.isPending} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `stock-dispatch-${name}-error` : undefined} {...form.register(name)} /></StockKitField>)}
    </form><RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="dispatch-standard-kit" disabled={mutation.isPending || !jobs.size || kit.tubes.length !== kit.container.capacity}>{mutation.isPending ? 'Recording…' : 'Record dispatch'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
function barcodeLines(value: string) { return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean) }
function StockKitField({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode }) { return <div><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label><div className="mt-2">{children}</div>{error ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">{error}</p> : null}</div> }
function StockKitSaveError({ error }: { error: unknown }) { return error ? <Alert variant="destructive"><AlertTitle>Kit changes were not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Review the current kit and try again. Your entries are retained.')}</AlertDescription></Alert> : null }
StockKitSaveError.dialogRegion = 'feedback' as const
