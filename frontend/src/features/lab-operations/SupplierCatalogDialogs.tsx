import { useId, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveSupplier, saveSupplierProduct, supplierCatalogKey, useProductTypes, productTypesKey, type CatalogSupplier, type SupplierProduct } from '#/api/supplier-catalog'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { useOrderDraftGuard } from '#/features/orders/use-order-draft-guard'

const supplierSchema = z.object({ name: z.string().trim().min(1, 'Enter a supplier name.').max(255), isActive: z.boolean() })
const productSchema = z.object({ productNumber: z.string().trim().min(1, 'Enter a product number.').max(100), description: z.string().trim().min(1, 'Enter a product description.').max(1000), productTypeId: z.string().uuid('Choose a product type.'), isActive: z.boolean() })
type SupplierValues = z.infer<typeof supplierSchema>
type ProductValues = z.infer<typeof productSchema>
const selectClass = 'h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

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
  const types = useProductTypes()
  const availableTypes = (types.data ?? []).filter(t => t.isActive || t.id === product?.productTypeId)
  const form = useForm<ProductValues>({ resolver: zodResolver(productSchema), defaultValues: { productNumber: product?.productNumber ?? '', description: product?.description ?? '', productTypeId: product?.productTypeId ?? '', isActive: product?.isActive ?? true } })
  const mutation = useMutation({ mutationFn: (values: ProductValues) => saveSupplierProduct(supplier.id, { ...values, version: product?.version }, product?.id), onSuccess: async () => { form.reset(form.getValues()); await Promise.all([cache.invalidateQueries({ queryKey: supplierCatalogKey }), cache.invalidateQueries({ queryKey: productTypesKey })]); onClose() } })
  const errors = form.formState.errors
  return <CatalogEditor title={product ? 'Edit product' : 'New product'} description={`${supplier.name}. Changes apply to future selections; existing kit records retain their original details.`} formId={id} dirty={form.formState.isDirty} busy={mutation.isPending} saveDisabled={types.isPending || types.isError || !availableTypes.length} error={mutation.error || types.error} onClose={onClose}>
    <form id={id} noValidate className="space-y-4" onSubmit={form.handleSubmit(values => { if (!mutation.isPending && !types.isPending && !types.isError) mutation.mutate(values) })}>
      <CatalogField id={`${id}-number`} label="Product #" error={errors.productNumber?.message}><Input id={`${id}-number`} disabled={mutation.isPending} aria-invalid={Boolean(errors.productNumber)} aria-describedby={errors.productNumber ? `${id}-number-error` : undefined} {...form.register('productNumber')} /></CatalogField>
      <CatalogField id={`${id}-description`} label="Product description" error={errors.description?.message}><Textarea id={`${id}-description`} disabled={mutation.isPending} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${id}-description-error` : undefined} {...form.register('description')} /></CatalogField>
      <CatalogField id={`${id}-type`} label="Product type" error={errors.productTypeId?.message}><select id={`${id}-type`} className={selectClass} disabled={mutation.isPending || types.isPending || types.isError} aria-invalid={Boolean(errors.productTypeId)} aria-describedby={errors.productTypeId ? `${id}-type-error` : undefined} {...form.register('productTypeId')}><option value="">Select a product type</option>{availableTypes.map(t => <option key={t.id} value={t.id}>{t.name}{t.isActive ? '' : ' (inactive)'}</option>)}</select></CatalogField>
      {types.isPending ? <p role="status">Loading product types…</p> : null}
      {types.isError ? <Button type="button" variant="outline" onClick={() => void types.refetch()}>Retry product types</Button> : null}
      {!types.isPending && !types.isError && !availableTypes.length ? <p className="text-sm">Add or reactivate a product type under Lab operations → Suppliers & Products → Product types first.</p> : null}
      {product ? <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" disabled={mutation.isPending} {...form.register('isActive')} />Active product</label> : null}
    </form>
  </CatalogEditor>
}
