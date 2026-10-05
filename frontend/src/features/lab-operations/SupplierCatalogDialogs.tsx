import { useEffect, useId, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tubeProductTypeId, shippingContainerProductTypeId, reagentProductTypeId, sequencingServiceProductTypeId, saveSupplier, saveSupplierProduct, supplierCatalogKey, useProductTypes, productTypesKey, type CatalogSupplier, type SupplierProduct } from '#/api/supplier-catalog'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { Field } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { useOrderDraftGuard } from '#/features/orders/use-order-draft-guard'
import { ScientificTextField } from './ScientificTextField'

const supplierSchema = z.object({ name: z.string().trim().min(1, 'Enter a supplier name.').max(255), isActive: z.boolean() })
const productSchema = z.object({ productNumber: z.string().trim().max(100), description: z.string().trim().max(1000), productTypeId: z.string().uuid('Choose a product type.'), defaultQuantityUnit: z.string().trim().max(50), tubeCapacity: z.string().trim().refine(value => !value || Number.isInteger(Number(value)) && Number(value) > 0, 'Enter a positive whole-number tube capacity.'), maximumSampleAmount: z.string().trim().refine(value => !value || Number(value) > 0 && Number.isFinite(Number(value)), 'Enter a positive maximum sample amount.'), sampleAmountUnit: z.enum(['', 'µL', 'mL']), canExpire: z.boolean(), isActive: z.boolean() }).superRefine((value, context) => {
  if (value.productTypeId !== sequencingServiceProductTypeId && !value.defaultQuantityUnit) context.addIssue({ code: 'custom', path: ['defaultQuantityUnit'], message: 'Enter the product inventory unit.' })
  if (!value.productNumber) context.addIssue({ code: 'custom', path: ['productNumber'], message: 'Enter a product name.' })
  if (!value.description) context.addIssue({ code: 'custom', path: ['description'], message: 'Enter a product description.' })
  if (Boolean(value.maximumSampleAmount) !== Boolean(value.sampleAmountUnit)) context.addIssue({ code: 'custom', path: ['sampleAmountUnit'], message: 'Enter both the maximum and its unit.' })
})
type SupplierValues = z.infer<typeof supplierSchema>
type ProductValues = z.infer<typeof productSchema>
const inventoryUnits = ['each', 'µL', 'mL', 'L', 'ng', 'µg', 'mg', 'g', 'kg'] as const

export function CatalogEditor({ title, description, formId, dirty, busy, error, onClose, children, saveDisabled = false }: { saveDisabled?: boolean; title: string; description: string; formId: string; dirty: boolean; busy: boolean; error: unknown; onClose: () => void; children: ReactNode }) {
  const [discard, setDiscard] = useState(false)
  useOrderDraftGuard(dirty, busy)
  function close() { if (!busy) { if (dirty) setDiscard(true); else onClose() } }
  return <>
    <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      {error ? <Alert variant="destructive"><AlertTitle>Changes were not saved</AlertTitle><AlertDescription>{getLabOperationsError(error, 'Review your entries and try again.')}</AlertDescription></Alert> : null}
      {children}
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button type="submit" form={formId} disabled={busy || saveDisabled}>{busy ? 'Saving…' : 'Save'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog>
    <Dialog open={discard} onOpenChange={setDiscard}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById(`${formId}-keep`)?.focus() }}><DialogHeader><DialogTitle>Discard changes?</DialogTitle></DialogHeader><div><DialogDescription>Your unsaved catalog changes will be lost.</DialogDescription></div><DialogFooter><Button id={`${formId}-keep`} variant="outline" onClick={() => setDiscard(false)}>Keep editing</Button><Button variant="destructive" onClick={onClose}>Discard changes</Button></DialogFooter></DialogContent></Dialog>
  </>
}
export function CatalogField({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) { return <Field><Label htmlFor={id}><RequiredFieldName>{label}</RequiredFieldName></Label>{children}{error ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p> : null}</Field> }

export function SupplierDialog({ supplier, onClose }: { supplier?: CatalogSupplier; onClose: () => void }) {
  const id = useId()
  const cache = useQueryClient()
  const form = useForm<SupplierValues>({ resolver: zodResolver(supplierSchema), defaultValues: { name: supplier?.name ?? '', isActive: supplier?.isActive ?? true } })
  const mutation = useMutation({ mutationFn: (values: SupplierValues) => saveSupplier({ ...values, version: supplier?.version }, supplier?.id), onSuccess: async () => { form.reset(form.getValues()); await Promise.all([cache.invalidateQueries({ queryKey: supplierCatalogKey }), cache.invalidateQueries({ queryKey: ['lab-sequencing-vendors'] }), cache.invalidateQueries({ queryKey: ['lab-operations'] })]); onClose() } })
  const error = form.formState.errors.name?.message
  return <CatalogEditor title={supplier ? 'Edit supplier' : 'New supplier'} description="Inactive suppliers and their products remain in history but cannot be selected for new shipments or kits." formId={id} dirty={form.formState.isDirty} busy={mutation.isPending} error={mutation.error} onClose={onClose}>
    <form id={id} noValidate className="space-y-4" onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}>
      <CatalogField id={`${id}-name`} label="Supplier name" error={error}><Input id={`${id}-name`} disabled={mutation.isPending} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-name-error` : undefined} {...form.register('name')} /></CatalogField>
      {supplier ? <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" disabled={mutation.isPending} {...form.register('isActive')} />Active supplier</label> : null}
    </form>
  </CatalogEditor>
}

export function SupplierProductDialog({ supplier, product, onClose }: { supplier: CatalogSupplier; product?: SupplierProduct; onClose: () => void }) {
  const id = useId()
  const cache = useQueryClient()
  const types = useProductTypes(!supplier.isInternalProducer)
  const availableTypes = (types.data ?? []).filter(t => (t.isActive || t.id === product?.productTypeId) && (!product || (product.productTypeId === sequencingServiceProductTypeId ? t.id === sequencingServiceProductTypeId : t.id !== sequencingServiceProductTypeId)))
  const form = useForm<ProductValues>({ resolver: zodResolver(productSchema.superRefine((value, context) => {
    if (value.productTypeId === sequencingServiceProductTypeId && value.isActive && !supplier.shipmentAddresses.some(address => address.isActive)) context.addIssue({ code: 'custom', path: ['productTypeId'], message: 'Add an active shipment address on this supplier before activating a sequencing service.' })
    if (availableTypes.some(type => type.id === value.productTypeId && type.kitUse === 'ShippingContainer') && !value.tubeCapacity)
      context.addIssue({ code: 'custom', path: ['tubeCapacity'], message: 'Enter how many tubes this container holds.' })
  })), defaultValues: { productNumber: product?.productNumber ?? '', description: product?.description ?? '', productTypeId: product?.productTypeId ?? (supplier.isInternalProducer ? reagentProductTypeId : ''), defaultQuantityUnit: product?.defaultQuantityUnit ?? ([tubeProductTypeId, shippingContainerProductTypeId].includes(product?.productTypeId ?? '') ? 'each' : ''), tubeCapacity: product?.tubeCapacity?.toString() ?? '', maximumSampleAmount: product?.maximumSampleAmount?.toString() ?? '', sampleAmountUnit: product?.sampleAmountUnit === 'µL' || product?.sampleAmountUnit === 'mL' ? product.sampleAmountUnit : '', canExpire: product?.canExpire ?? false, isActive: product?.isActive ?? true } })
  const selectedTypeId = form.watch('productTypeId')
  const selectedType = availableTypes.find(type => type.id === selectedTypeId)
  const serviceProduct = selectedTypeId === sequencingServiceProductTypeId
  const tubeProduct = selectedTypeId === tubeProductTypeId || selectedType?.kitUse === 'Tube'
  const containerProduct = selectedType?.kitUse === 'ShippingContainer'
  useEffect(() => { if ((tubeProduct || containerProduct) && !form.getValues('defaultQuantityUnit').trim()) form.setValue('defaultQuantityUnit', 'each', { shouldValidate: true }) }, [form, tubeProduct, containerProduct])
  const unitFixed = Boolean(supplier.isInternalProducer && product?.defaultQuantityUnit)
  const unitHelp = tubeProduct ? 'Tubes default to each: one unit is one physical tube. The tube volume describes its capacity.' : supplier.isInternalProducer ? 'Every reagent manufacturing run records its final yield in this unit. Once set, the unit is fixed.' : 'All new material lots for this product use this unit. Enter amounts in this unit when receiving stock.'
  const mutation = useMutation({ mutationFn: (values: ProductValues) => saveSupplierProduct(supplier.id, { ...values, defaultQuantityUnit: serviceProduct ? null : values.defaultQuantityUnit, canExpire: serviceProduct ? false : values.canExpire, tubeCapacity: containerProduct ? Number(values.tubeCapacity) : null, maximumSampleAmount: tubeProduct && values.maximumSampleAmount ? Number(values.maximumSampleAmount) : null, sampleAmountUnit: tubeProduct ? values.sampleAmountUnit || null : null, version: product?.version }, product?.id), onSuccess: async () => { form.reset(form.getValues()); await Promise.all([cache.invalidateQueries({ queryKey: supplierCatalogKey }), cache.invalidateQueries({ queryKey: ['lab-sequencing-vendors'] }), cache.invalidateQueries({ queryKey: productTypesKey }), cache.invalidateQueries({ queryKey: ['lab-lot-products'] })]); onClose() } })
  const errors = form.formState.errors
  return <CatalogEditor title={product ? 'Edit product' : 'New product'} description={supplier.isInternalProducer ? 'Define a Phaeno reagent and its inventory unit.' : `${supplier.name}. Changes apply to future selections; saved shipments and kit records retain their original details.`} formId={id} dirty={form.formState.isDirty} busy={mutation.isPending} saveDisabled={!supplier.isInternalProducer && (types.isPending || types.isError || !availableTypes.length)} error={mutation.error || (!supplier.isInternalProducer && types.error)} onClose={onClose}>
    <form id={id} noValidate className="space-y-4" onSubmit={form.handleSubmit(values => { if (!mutation.isPending && (supplier.isInternalProducer || !types.isPending && !types.isError)) mutation.mutate(values) })}>
      {supplier.isInternalProducer ? <CatalogField id={`${id}-type`} label="Product type" error={errors.productTypeId?.message}><NativeSelect id={`${id}-type`} disabled={mutation.isPending || Boolean(product)} aria-invalid={Boolean(errors.productTypeId)} aria-describedby={errors.productTypeId ? `${id}-type-error` : undefined} {...form.register('productTypeId')} onChange={event => { form.setValue('productTypeId', event.target.value, { shouldDirty: true, shouldValidate: true }); form.setValue('defaultQuantityUnit', '', { shouldDirty: true, shouldValidate: true }) }}><option value={reagentProductTypeId}>Reagent</option></NativeSelect></CatalogField> : <CatalogField id={`${id}-type`} label="Product type" error={errors.productTypeId?.message}><NativeSelect id={`${id}-type`} disabled={mutation.isPending || types.isPending || types.isError} aria-invalid={Boolean(errors.productTypeId)} aria-describedby={errors.productTypeId ? `${id}-type-error` : undefined} {...form.register('productTypeId')} onChange={event => { form.setValue('productTypeId', event.target.value, { shouldDirty: true, shouldValidate: true }); if (event.target.value === sequencingServiceProductTypeId) { form.setValue('defaultQuantityUnit', '', { shouldDirty: true }); form.setValue('canExpire', false, { shouldDirty: true }) } else if (availableTypes.some(type => type.id === event.target.value && type.kitUse === 'Tube')) form.setValue('defaultQuantityUnit', 'each', { shouldDirty: true, shouldValidate: true }) }}><option value="">Select a product type</option>{availableTypes.map(t => <option key={t.id} value={t.id}>{t.name}{t.isActive ? '' : ' (inactive)'}</option>)}</NativeSelect></CatalogField>}
      {!supplier.isInternalProducer && types.isPending ? <p role="status">Loading product types…</p> : null}
      {!supplier.isInternalProducer && types.isError ? <Button type="button" variant="outline" onClick={() => void types.refetch()}>Retry product types</Button> : null}
      {!supplier.isInternalProducer && !types.isPending && !types.isError && !availableTypes.length ? <p className="text-sm">Add or reactivate a product type under More → Purchasing → Products → Product types first.</p> : null}
      <CatalogField id={`${id}-number`} label="Product name" error={errors.productNumber?.message}><Input id={`${id}-number`} disabled={mutation.isPending} aria-invalid={Boolean(errors.productNumber)} aria-describedby={errors.productNumber ? `${id}-number-error` : undefined} {...form.register('productNumber')} /></CatalogField>
      <CatalogField id={`${id}-description`} label="Product description" error={errors.description?.message}><Textarea id={`${id}-description`} disabled={mutation.isPending} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${id}-description-error` : undefined} {...form.register('description')} /></CatalogField>
      {containerProduct ? <CatalogField id={`${id}-capacity`} label="Tube capacity" error={errors.tubeCapacity?.message}><Input id={`${id}-capacity`} type="number" min={1} step={1} disabled={mutation.isPending} aria-invalid={Boolean(errors.tubeCapacity)} aria-describedby={`${id}-capacity-help${errors.tubeCapacity ? ` ${id}-capacity-error` : ''}`} {...form.register('tubeCapacity')} /><p id={`${id}-capacity-help`} className="text-xs text-muted-foreground">Maximum number of individual tubes this outer container holds. A kit specification may use fewer.</p></CatalogField> : null}
      {tubeProduct ? <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`${id}-sample-maximum`}>Maximum sample amount</Label><Input id={`${id}-sample-maximum`} type="number" min="0" step="any" disabled={mutation.isPending} aria-invalid={Boolean(errors.maximumSampleAmount)} aria-describedby={errors.maximumSampleAmount ? `${id}-sample-maximum-error` : undefined} {...form.register('maximumSampleAmount')} />{errors.maximumSampleAmount ? <p id={`${id}-sample-maximum-error`} role="alert" className="text-sm text-destructive">{errors.maximumSampleAmount.message}</p> : null}</div><div className="space-y-2"><Label htmlFor={`${id}-sample-unit`}>Sample amount unit</Label><NativeSelect id={`${id}-sample-unit`} disabled={mutation.isPending} aria-invalid={Boolean(errors.sampleAmountUnit)} aria-describedby={errors.sampleAmountUnit ? `${id}-sample-unit-error` : undefined} {...form.register('sampleAmountUnit')}><option value="">Choose unit…</option><option value="µL">µL</option><option value="mL">mL</option></NativeSelect>{errors.sampleAmountUnit ? <p id={`${id}-sample-unit-error`} role="alert" className="text-sm text-destructive">{errors.sampleAmountUnit.message}</p> : null}</div><p className="text-xs text-muted-foreground sm:col-span-2">This is the most sample material one tube can hold. Its unit must match the Sample type minimum before a Customer can save a sample/tube pair.</p></div> : null}
      {serviceProduct ? <p className="text-sm text-muted-foreground">Sequencing services use this supplier’s shipment addresses. Physical inventory and expiration do not apply.</p> : <>
      <CatalogField id={`${id}-unit`} label="Inventory unit" error={errors.defaultQuantityUnit?.message}>{unitFixed
        ? <><Input id={`${id}-unit`} disabled={mutation.isPending} readOnly maxLength={50} placeholder="each, mL, µL…" aria-invalid={Boolean(errors.defaultQuantityUnit)} aria-describedby={[errors.defaultQuantityUnit ? `${id}-unit-error` : null, `${id}-unit-help`].filter(Boolean).join(' ')} {...form.register('defaultQuantityUnit')} /><p id={`${id}-unit-help`} className="text-xs text-muted-foreground">{unitHelp}</p></>
        : <ScientificTextField control={form.control} name="defaultQuantityUnit" id={`${id}-unit`} label="Inventory unit" unit unitOptions={inventoryUnits} showSymbols={false} disabled={mutation.isPending} placeholder="each, mL, µL…" describedBy={[errors.defaultQuantityUnit ? `${id}-unit-error` : null, `${id}-unit-help`].filter(Boolean).join(' ')} supportingText={<p id={`${id}-unit-help`} className="text-xs text-muted-foreground">{unitHelp}</p>} />}</CatalogField>
      <div className="space-y-1.5"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" disabled={mutation.isPending} aria-describedby={`${id}-expiry-help`} {...form.register('canExpire')} />Can expire</label><p id={`${id}-expiry-help`} className="text-xs text-muted-foreground">Require an expiration date when recording new inventory for this product. Saved inventory dates remain unchanged.</p></div></>}
      {product ? <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" disabled={mutation.isPending} {...form.register('isActive')} />Active product</label> : null}
    </form>
  </CatalogEditor>
}
