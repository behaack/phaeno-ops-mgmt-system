import { useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useFieldArray } from 'react-hook-form'
import type { CatalogSupplier } from '#/api/supplier-catalog'
import type { ShippingContainerDefinition } from '#/api/shipping-containers'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'
import type { ShippingContainerForm } from './ShippingContainerEditor'

const selectClass = 'h-9 w-full min-w-0 cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'

export function ShippingKitContentFields({ form, suppliers, source, disabled }: {
  form: ShippingContainerForm
  suppliers: CatalogSupplier[]
  source: ShippingContainerDefinition | null
  disabled: boolean
}) {
  const addButton = useRef<HTMLButtonElement>(null)
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'kitContents' })
  const values = form.watch('kitContents') ?? []
  const errors = form.formState.errors.kitContents
  return <section aria-labelledby="kit-contents-heading" className="space-y-3 rounded-md border p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 id="kit-contents-heading" className="text-sm font-medium">Bill of materials</h3>
      <Button ref={addButton} type="button" variant="outline" size="sm" disabled={disabled} onClick={() => append({ supplierId: '', supplierProductId: '', quantity: 1 })}><Plus aria-hidden="true" />Add product</Button>
    </div>
    <p className="text-xs text-muted-foreground">List the products included in one complete kit, with a quantity for each. Products can come from different suppliers. Usable tube capacity is set separately.</p>
    {fields.map((field, index) => {
      const value = values[index]
      const supplier = suppliers.find(item => item.id === value?.supplierId)
      const products = supplier?.products.filter(item => item.isActive && item.productTypeIsActive) ?? []
      const saved = source?.kitContents?.find(item => item.supplierProductId === value?.supplierProductId)
      const savedSupplier = source?.kitContents?.find(item => item.supplierId === value?.supplierId)
      const supplierId = `kit-content-${index}-supplier`
      const productId = `kit-content-${index}-product`
      const quantityId = `kit-content-${index}-quantity`
      const error = errors?.[index]
      return <fieldset key={field.id} className="min-w-0 space-y-2 rounded-md border p-3">
        <legend className="px-1 text-xs font-medium">Product {index + 1}</legend>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_6.5rem_auto]">
          <div className="min-w-0 space-y-1">
            <Label htmlFor={supplierId}><RequiredFieldName>Supplier</RequiredFieldName></Label>
            <select id={supplierId} className={selectClass} disabled={disabled} aria-required="true" aria-invalid={Boolean(error?.supplierId)} aria-describedby={error?.supplierId ? `${supplierId}-error` : undefined}
              {...form.register(`kitContents.${index}.supplierId`)} value={value?.supplierId ?? ''} onChange={event => {
                form.setValue(`kitContents.${index}.supplierId`, event.target.value, { shouldDirty: true, shouldValidate: true })
                form.setValue(`kitContents.${index}.supplierProductId`, '', { shouldDirty: true, shouldValidate: true })
              }}>
              <option value="">Select supplier</option>
              {savedSupplier && !supplier ? <option value={savedSupplier.supplierId} disabled>{savedSupplier.supplierName} (unavailable)</option> : null}
              {suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {error?.supplierId ? <p id={`${supplierId}-error`} className="text-xs text-destructive">{error.supplierId.message}</p> : null}
          </div>
          <div className="min-w-0 space-y-1">
            <Label htmlFor={productId}><RequiredFieldName>Product name</RequiredFieldName></Label>
            <select id={productId} className={selectClass} disabled={disabled || !supplier} aria-required="true" aria-invalid={Boolean(error?.supplierProductId)} aria-describedby={error?.supplierProductId ? `${productId}-error` : undefined}
              {...form.register(`kitContents.${index}.supplierProductId`)} value={value?.supplierProductId ?? ''} onChange={event => form.setValue(`kitContents.${index}.supplierProductId`, event.target.value, { shouldDirty: true, shouldValidate: true })}>
              <option value="">{supplier && !products.length ? 'No active products' : 'Select product'}</option>
              {saved && !products.some(item => item.id === saved.supplierProductId) ? <option value={saved.supplierProductId} disabled>{saved.productNumber} (unavailable)</option> : null}
              {products.map(item => <option key={item.id} value={item.id}>{item.productNumber} — {item.description}</option>)}
            </select>
            {error?.supplierProductId ? <p id={`${productId}-error`} className="text-xs text-destructive">{error.supplierProductId.message}</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor={quantityId}><RequiredFieldName>Quantity</RequiredFieldName></Label>
            <Input id={quantityId} type="number" min={1} step={1} disabled={disabled} aria-required="true" aria-invalid={Boolean(error?.quantity)} aria-describedby={error?.quantity ? `${quantityId}-error` : undefined} {...form.register(`kitContents.${index}.quantity`)} />
            {error?.quantity ? <p id={`${quantityId}-error`} className="text-xs text-destructive">{error.quantity.message}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="icon" className="sm:mt-5" disabled={disabled} aria-label={`Remove product ${index + 1}`} onClick={() => { remove(index); addButton.current?.focus() }}><Trash2 aria-hidden="true" /></Button>
        </div>
      </fieldset>
    })}
    {!fields.length ? <p className="text-sm text-muted-foreground">Add the products supplied with this kit before activating it.</p> : null}
    {errors?.root?.message || errors?.message ? <p role="alert" className="text-xs text-destructive">{errors.root?.message ?? errors.message}</p> : null}
    <p className="text-xs text-muted-foreground">Manage available products in <Link className="underline" to="/lab-operations" search={{ section: 'suppliers' }}>Suppliers &amp; products</Link>.</p>
  </section>
}
