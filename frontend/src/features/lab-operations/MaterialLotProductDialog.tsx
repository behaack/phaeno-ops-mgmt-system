import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { assignLotProduct, useLotProducts } from '#/api/lab-materials'
import type { LabMaterialLot } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { CatalogEditor, CatalogField } from './SupplierCatalogDialogs'
import { prepSelectClass } from './preparation-ui'

const schema = z.object({ productId: z.string().uuid('Select the product this lot belongs to.') })

export function MaterialLotProductDialog({ lot, onClose }: { lot: LabMaterialLot; onClose: () => void }) {
  const id = useId()
  const catalog = useLotProducts()
  const client = useQueryClient()
  const products = catalog.data?.find(s => s.id === lot.supplierId)?.products ?? []
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { productId: '' } })
  const save = useMutation({ mutationFn: ({ productId }: z.infer<typeof schema>) => assignLotProduct(lot.id, productId, lot.version), onSuccess: async () => { form.reset(); await client.invalidateQueries({ queryKey: ['lab-operations'] }); await client.invalidateQueries({ queryKey: ['lab-preparation'] }); onClose() } })
  return <CatalogEditor title="Assign product" description={`${lot.name} · ${lot.lotNumber}. Confirm the product on the lot's label. This assignment cannot be replaced after saving.`} formId={id} dirty={form.formState.isDirty} busy={save.isPending} error={save.error || catalog.error} onClose={onClose} saveDisabled={catalog.isPending || catalog.isError || !products.length}>
    <form id={id} className="space-y-4" noValidate onSubmit={form.handleSubmit(values => { if (!save.isPending && !catalog.isPending && !catalog.isError) save.mutate(values) })}>
      <p className="text-sm">Supplier: {lot.supplier}</p>
      <CatalogField id={`${id}-product`} label="Product name" error={form.formState.errors.productId?.message}>
        <select id={`${id}-product`} className={prepSelectClass} disabled={save.isPending || catalog.isPending || catalog.isError} aria-invalid={Boolean(form.formState.errors.productId)} aria-describedby={form.formState.errors.productId ? `${id}-product-error` : undefined} {...form.register('productId')}><option value="">Select product…</option>{products.map(p => <option key={p.id} value={p.id}>{p.productNumber} — {p.description}</option>)}</select>
      </CatalogField>
      {catalog.isPending ? <p role="status">Loading products…</p> : catalog.isError ? <Button type="button" variant="outline" onClick={() => void catalog.refetch()}>Retry products</Button> : !products.length ? <p className="text-sm text-muted-foreground">No active products are available for this supplier. Add or activate the product in Suppliers &amp; products first.</p> : null}
    </form>
  </CatalogEditor>
}
