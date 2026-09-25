import { useId, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reagentProductTypeId, transportationKitProductTypeId, saveSupplier, saveSupplierProduct, supplierCatalogKey, useProductTypes, productTypesKey, type CatalogSupplier, type SupplierProduct } from '#/api/supplier-catalog'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { useOrderDraftGuard } from '#/features/orders/use-order-draft-guard'
import { ScientificTextField } from './ScientificTextField'

const supplierSchema = z.object({ name: z.string().trim().min(1, 'Enter a supplier name.').max(255), isActive: z.boolean() })
const productSchema = z.object({ productNumber: z.string().trim().max(100), description: z.string().trim().max(1000), productTypeId: z.string().uuid('Choose a product type.'), defaultQuantityUnit: z.string().trim().min(1, 'Enter the product inventory unit.').max(50), canExpire: z.boolean(), isActive: z.boolean() }).superRefine((value, context) => {
  if (!value.productNumber) context.addIssue({ code: 'custom', path: ['productNumber'], message: value.productTypeId === transportationKitProductTypeId ? 'Enter a SKU.' : 'Enter a product name.' })
  if (!value.description) context.addIssue({ code: 'custom', path: ['description'], message: value.productTypeId === transportationKitProductTypeId ? 'Enter a kit name.' : 'Enter a product description.' })
  if (value.productTypeId === transportationKitProductTypeId && value.description.length > 255) context.addIssue({ code: 'custom', path: ['description'], message: 'Keep the kit name within 255 characters.' })
})
type SupplierValues = z.infer<typeof supplierSchema>
type ProductValues = z.infer<typeof productSchema>
const selectClass = 'h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
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
    <Dialog open={discard} onOpenChange={setDiscard}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById(`${formId}-keep`)?.focus() }}><DialogHeader><DialogTitle>Discard changes?</DialogTitle><DialogDescription>Your unsaved catalog changes will be lost.</DialogDescription></DialogHeader><DialogFooter><Button id={`${formId}-keep`} variant="outline" onClick={() => setDiscard(false)}>Keep editing</Button><Button variant="destructive" onClick={onClose}>Discard changes</Button></DialogFooter></DialogContent></Dialog>
  </>
}
export function CatalogField({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) { return <div className="space-y-2"><Label htmlFor={id}><RequiredFieldName>{label}</RequiredFieldName></Label>{children}{error ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p> : null}</div> }

export function SupplierDialog({ supplier, onClose }: { supplier?: CatalogSupplier; onClose: () => void }) {
  const id = useId()
  const cache = useQueryClient()
  const form = useForm<SupplierValues>({ resolver: zodResolver(supplierSchema), defaultValues: { name: supplier?.name ?? '', isActive: supplier?.isActive ?? true } })
  const mutation = useMutation({ mutationFn: (values: SupplierValues) => saveSupplier({ ...values, version: supplier?.version }, supplier?.id), onSuccess: async () => { form.reset(form.getValues()); await Promise.all([cache.invalidateQueries({ queryKey: supplierCatalogKey }), cache.invalidateQueries({ queryKey: ['lab-operations'] })]); onClose() } })
  const error = form.formState.errors.name?.message
  return <CatalogEditor title={supplier ? 'Edit supplier' : 'New supplier'} description="Inactive suppliers and their products remain in history but cannot be selected for new kits." formId={id} dirty={form.formState.isDirty} busy={mutation.isPending} error={mutation.error} onClose={onClose}>
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
  const availableTypes = (types.data ?? []).filter(t => t.isActive || t.id === product?.productTypeId)
  const form = useForm<ProductValues>({ resolver: zodResolver(productSchema), defaultValues: { productNumber: product?.productNumber ?? '', description: product?.description ?? '', productTypeId: product?.productTypeId ?? (supplier.isInternalProducer ? reagentProductTypeId : ''), defaultQuantityUnit: product?.defaultQuantityUnit ?? '', canExpire: product?.canExpire ?? false, isActive: product?.isActive ?? true } })
  const kitProduct = supplier.isInternalProducer && form.watch('productTypeId') === transportationKitProductTypeId
  const unitFixed = Boolean(kitProduct || supplier.isInternalProducer && product?.defaultQuantityUnit)
  const unitHelp = kitProduct ? 'Finished kits are counted individually. Their unit is always each.' : supplier.isInternalProducer ? 'Every reagent manufacturing run records its final yield in this unit. Once set, the unit is fixed.' : 'All new material lots for this product use this unit. Enter amounts in this unit when receiving stock.'
  const mutation = useMutation({ mutationFn: (values: ProductValues) => saveSupplierProduct(supplier.id, { ...values, version: product?.version }, product?.id), onSuccess: async () => { form.reset(form.getValues()); await Promise.all([cache.invalidateQueries({ queryKey: supplierCatalogKey }), cache.invalidateQueries({ queryKey: productTypesKey }), cache.invalidateQueries({ queryKey: ['lab-lot-products'] })]); onClose() } })
  const errors = form.formState.errors
  return <CatalogEditor title={product ? 'Edit product' : 'New product'} description={supplier.isInternalProducer ? 'Define a Phaeno reagent or finished transportation kit. Assembly instructions and shipping specifications are configured after saving the product.' : `${supplier.name}. Changes apply to future selections; existing kit records retain their original details.`} formId={id} dirty={form.formState.isDirty} busy={mutation.isPending} saveDisabled={!supplier.isInternalProducer && (types.isPending || types.isError || !availableTypes.length)} error={mutation.error || (!supplier.isInternalProducer && types.error)} onClose={onClose}>
    <form id={id} noValidate className="space-y-4" onSubmit={form.handleSubmit(values => { if (!mutation.isPending && (supplier.isInternalProducer || !types.isPending && !types.isError)) mutation.mutate(values) })}>
      {supplier.isInternalProducer ? <CatalogField id={`${id}-type`} label="Product type" error={errors.productTypeId?.message}><select id={`${id}-type`} className={selectClass} disabled={mutation.isPending || Boolean(product)} aria-invalid={Boolean(errors.productTypeId)} aria-describedby={errors.productTypeId ? `${id}-type-error` : undefined} {...form.register('productTypeId')} onChange={event => { form.setValue('productTypeId', event.target.value, { shouldDirty: true, shouldValidate: true }); if (event.target.value === transportationKitProductTypeId) form.setValue('defaultQuantityUnit', 'each', { shouldDirty: true, shouldValidate: true }); else form.setValue('defaultQuantityUnit', '', { shouldDirty: true, shouldValidate: true }) }}><option value={reagentProductTypeId}>Reagent</option><option value={transportationKitProductTypeId}>Transportation kit</option></select></CatalogField> : <CatalogField id={`${id}-type`} label="Product type" error={errors.productTypeId?.message}><select id={`${id}-type`} className={selectClass} disabled={mutation.isPending || types.isPending || types.isError} aria-invalid={Boolean(errors.productTypeId)} aria-describedby={errors.productTypeId ? `${id}-type-error` : undefined} {...form.register('productTypeId')}><option value="">Select a product type</option>{availableTypes.map(t => <option key={t.id} value={t.id}>{t.name}{t.isActive ? '' : ' (inactive)'}</option>)}</select></CatalogField>}
      {!supplier.isInternalProducer && types.isPending ? <p role="status">Loading product types…</p> : null}
      {!supplier.isInternalProducer && types.isError ? <Button type="button" variant="outline" onClick={() => void types.refetch()}>Retry product types</Button> : null}
      {!supplier.isInternalProducer && !types.isPending && !types.isError && !availableTypes.length ? <p className="text-sm">Add or reactivate a product type under Lab operations → Suppliers & products → Product types first.</p> : null}
      <CatalogField id={`${id}-number`} label={kitProduct ? 'SKU' : 'Product name'} error={errors.productNumber?.message}><Input id={`${id}-number`} disabled={mutation.isPending} readOnly={Boolean(kitProduct && product)} aria-invalid={Boolean(errors.productNumber)} aria-describedby={[errors.productNumber ? `${id}-number-error` : null, kitProduct && product ? `${id}-number-help` : null].filter(Boolean).join(' ') || undefined} {...form.register('productNumber')} />{kitProduct && product ? <p id={`${id}-number-help`} className="text-xs text-muted-foreground">The SKU is fixed after creation. Create a new kit product for a different SKU.</p> : null}</CatalogField>
      <CatalogField id={`${id}-description`} label={kitProduct ? 'Kit name' : 'Product description'} error={errors.description?.message}>{kitProduct
        ? <Input id={`${id}-description`} disabled={mutation.isPending} maxLength={255} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${id}-description-error` : undefined} {...form.register('description')} />
        : <Textarea id={`${id}-description`} disabled={mutation.isPending} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${id}-description-error` : undefined} {...form.register('description')} />}</CatalogField>
      <CatalogField id={`${id}-unit`} label="Inventory unit" error={errors.defaultQuantityUnit?.message}>{unitFixed
        ? <><Input id={`${id}-unit`} disabled={mutation.isPending} readOnly maxLength={50} placeholder="each, mL, µL…" aria-invalid={Boolean(errors.defaultQuantityUnit)} aria-describedby={[errors.defaultQuantityUnit ? `${id}-unit-error` : null, `${id}-unit-help`].filter(Boolean).join(' ')} {...form.register('defaultQuantityUnit')} /><p id={`${id}-unit-help`} className="text-xs text-muted-foreground">{unitHelp}</p></>
        : <ScientificTextField control={form.control} name="defaultQuantityUnit" id={`${id}-unit`} label="Inventory unit" unit unitOptions={inventoryUnits} showSymbols={false} disabled={mutation.isPending} placeholder="each, mL, µL…" describedBy={[errors.defaultQuantityUnit ? `${id}-unit-error` : null, `${id}-unit-help`].filter(Boolean).join(' ')} supportingText={<p id={`${id}-unit-help`} className="text-xs text-muted-foreground">{unitHelp}</p>} />}</CatalogField>
      <div className="space-y-1.5"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" disabled={mutation.isPending} aria-describedby={`${id}-expiry-help`} {...form.register('canExpire')} />Can expire</label><p id={`${id}-expiry-help`} className="text-xs text-muted-foreground">Require an expiration date when recording new inventory for this product. Saved inventory dates remain unchanged.</p></div>
      {product ? <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" disabled={mutation.isPending} {...form.register('isActive')} />Active product</label> : null}
    </form>
  </CatalogEditor>
}
