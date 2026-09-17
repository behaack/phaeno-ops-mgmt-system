import { useId, useState } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProductTypes, saveProductType, productTypesKey, supplierCatalogKey, productKindLabel, type ProductType } from '#/api/supplier-catalog'
import { getLabOperationsError } from '#/api/lab-operations'
import { usePhaenoSession } from '#/features/auth/session-context'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { CatalogActions, CatalogStatusConfirmation } from './CatalogActions'
import { CatalogEditor, CatalogField } from './SupplierCatalogDialogs'

export function ProductTypesPage({ productTypeId }: { productTypeId?: string }) {
  const { session, authProvider } = usePhaenoSession()
  const allowed = Boolean(session?.capabilities.canManageOrderConfiguration)
  const query = useProductTypes(allowed && authProvider !== 'mock')
  const filters = useSearch({ strict: false })
  const [search, setSearch] = useState(filters.productTypeSearch ?? '')
  const [showInactive, setShowInactive] = useState(filters.productTypeInactive ?? false)
  const [editing, setEditing] = useState<ProductType | 'new' | null>(null)
  const [statusTarget, setStatusTarget] = useState<ProductType | null>(null)
  if (!allowed) return <p>Product types require a Phaeno platform administrator.</p>
  if (authProvider === 'mock') return <p>Use a connected Phaeno session to manage product types.</p>
  if (query.isPending) return <p role="status">Loading product types…</p>
  if (query.isError && !query.data) return <div><p role="alert">{getLabOperationsError(query.error, 'Product types could not be loaded.')}</p><Button onClick={() => void query.refetch()}>Try again</Button></div>
  const types = query.data ?? []
  const type = types.find(t => t.id === productTypeId)
  const backSearch = { section: 'suppliers' as const, supplierTab: 'product-types' as const, productTypeSearch: filters.productTypeSearch, productTypeInactive: filters.productTypeInactive }
  if (productTypeId && !type) return <div className="page-wrap px-4 py-8"><Link to="/lab-operations" search={backSearch}>Back to product types</Link><p>Product type not found.</p></div>
  const matches = types.filter(t => (showInactive || t.isActive) && `${t.name} ${t.description}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  return <div className={productTypeId ? 'page-wrap space-y-5 px-4 py-8' : 'space-y-5'}>
    {query.isError ? <p role="alert">Refresh failed. Your current edits are retained. <button className="cursor-pointer underline" onClick={() => void query.refetch()}>Retry</button></p> : null}
    {type ? <Link className="text-sm text-primary underline" to="/lab-operations" search={backSearch}>Back to product types</Link> : null}
    <Card><CardHeader><CardTitle><h1>{type ? type.name : 'Product types'}</h1></CardTitle><CardDescription>{type ? type.description : 'Organize supplier products, including reagents, tubes and shipping containers.'}</CardDescription><CardAction>{type ? <ProductTypeActions type={type} onEdit={() => setEditing(type)} onStatus={() => setStatusTarget(type)} /> : <Button onClick={() => setEditing('new')}>+ New product type</Button>}</CardAction></CardHeader><CardContent className="space-y-4">
      {type ? <dl className="space-y-3 text-sm"><div><dt className="text-muted-foreground">Status</dt><dd>{type.isActive ? 'Active' : 'Inactive'}</dd></div><div><dt className="text-muted-foreground">Use in transportation kits</dt><dd>{productKindLabel(type.kitUse)}</dd></div><div><dt className="text-muted-foreground">Products using this type</dt><dd>{type.productCount}</dd></div></dl> : <>
        <div className="flex flex-wrap items-end gap-4"><div className="min-w-48 flex-1"><Label htmlFor="product-type-search">Search product types</Label><Input id="product-type-search" className="mt-2" value={search} onChange={e => setSearch(e.target.value)} /></div><label className="flex cursor-pointer items-center gap-2 py-2 text-sm"><input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />Show inactive</label></div>
        {matches.length ? <table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-3 font-medium">Product type</th><th className="hidden px-2 py-3 font-medium sm:table-cell">Products</th><th className="py-3 font-medium">Status</th><th className="py-3 pl-3 text-right font-medium"><span className="sr-only">Actions</span></th></tr></thead><tbody>{matches.map(t => <tr key={t.id} className="border-b last:border-0"><td className="py-4 pr-3"><Link className="font-medium text-primary underline wrap-anywhere" to="/lab-operations/product-types/$productTypeId" params={{ productTypeId: t.id }} search={{ section: 'suppliers', supplierTab: 'product-types', productTypeSearch: search || undefined, productTypeInactive: showInactive || undefined }}>{t.name}</Link><p className="mt-1 text-muted-foreground">{productKindLabel(t.kitUse)}</p><p className="mt-1 text-muted-foreground sm:hidden">{t.productCount} products</p></td><td className="hidden px-2 py-4 sm:table-cell">{t.productCount}</td><td className="py-4"><Badge variant="secondary">{t.isActive ? 'Active' : 'Inactive'}</Badge></td><td className="py-4 pl-3 text-right"><ProductTypeActions type={t} onEdit={() => setEditing(t)} onStatus={() => setStatusTarget(t)} /></td></tr>)}</tbody></table> : <p className="text-sm text-muted-foreground">{types.length ? 'No product types match these filters.' : 'No product types yet. Add a type to classify supplier products.'}</p>}
      </>}
    </CardContent></Card>
    {editing ? <ProductTypeDialog type={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    {statusTarget ? <ProductTypeStatusDialog type={statusTarget} onClose={() => setStatusTarget(null)} /> : null}
  </div>
}
function ProductTypeActions({ type, onEdit, onStatus }: { type: ProductType; onEdit: () => void; onStatus: () => void }) {
  return <CatalogActions id={`product-type-actions-${type.id}`} name={type.name} isActive={type.isActive} onEdit={onEdit} onStatus={onStatus} />
}
function ProductTypeStatusDialog({ type, onClose }: { type: ProductType; onClose: () => void }) {
  const cache = useQueryClient()
  return <CatalogStatusConfirmation name={type.name} isActive={type.isActive} actionId={`product-type-actions-${type.id}`} fallbackId="product-type-search" onClose={onClose}
    description={type.isActive ? 'This type and its products will no longer be available for new product assignments or kit selections. Existing products and kit history will be preserved.' : 'This type will be available for product assignments again. Kit selections still require an active supplier and product with a suitable kit use.'}
    onSave={async () => {
      const updated = await saveProductType({ name: type.name, description: type.description, kitUse: type.kitUse, isActive: !type.isActive, version: type.version }, type.id)
      cache.setQueryData<ProductType[]>(productTypesKey, previous => previous?.map(item => item.id === updated.id ? updated : item))
    }} />
}

const schema = z.object({ name: z.string().trim().min(1, 'Enter a type name.').max(100), description: z.string().trim().min(1, 'Enter a description.').max(1000), kitUse: z.enum(['Tube', 'ShippingContainer', 'Other']), isActive: z.boolean() })
type Values = z.infer<typeof schema>
export function ProductTypeDialog({ type, onClose }: { type?: ProductType; onClose: () => void }) {
  const id = useId()
  const cache = useQueryClient()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: type?.name ?? '', description: type?.description ?? '', kitUse: type?.kitUse ?? 'Other', isActive: type?.isActive ?? true } })
  const save = useMutation({ mutationFn: (values: Values) => saveProductType({ ...values, version: type?.version }, type?.id), onSuccess: async () => { form.reset(form.getValues()); await Promise.all([cache.invalidateQueries({ queryKey: productTypesKey }), cache.invalidateQueries({ queryKey: supplierCatalogKey })]); onClose() } })
  const errors = form.formState.errors
  return <CatalogEditor title={type ? 'Edit product type' : 'New product type'} description="Inactive types remain in history but are unavailable for new products and kit selections." formId={id} dirty={form.formState.isDirty} busy={save.isPending} error={save.error} onClose={onClose}>
    <form id={id} noValidate className="space-y-4" onSubmit={form.handleSubmit(values => { if (!save.isPending) save.mutate(values) })}>
      <CatalogField id={`${id}-name`} label="Type name" error={errors.name?.message}><Input id={`${id}-name`} disabled={save.isPending} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${id}-name-error` : undefined} {...form.register('name')} /></CatalogField>
      <CatalogField id={`${id}-description`} label="Description" error={errors.description?.message}><Textarea id={`${id}-description`} disabled={save.isPending} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${id}-description-error` : undefined} {...form.register('description')} /></CatalogField>
      <CatalogField id={`${id}-use`} label="Use in transportation kits" error={errors.kitUse?.message}>{type?.productCount ? <><input type="hidden" {...form.register('kitUse')} /><Input id={`${id}-use`} readOnly value={productKindLabel(type.kitUse)} aria-describedby={`${id}-use-help`} /></> : <select id={`${id}-use`} className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" disabled={save.isPending} aria-invalid={Boolean(errors.kitUse)} aria-describedby={errors.kitUse ? `${id}-use-error` : type?.productCount ? `${id}-use-help` : undefined} {...form.register('kitUse')}><option value="Other">Not used in transportation kits</option><option value="Tube">Tube</option><option value="ShippingContainer">Shipping Container</option></select>}</CatalogField>
      {type?.productCount ? <p id={`${id}-use-help`} className="text-sm text-muted-foreground">Products already use this type, so its kit use cannot change. Create a different type if needed.</p> : null}
      {type ? <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" disabled={save.isPending} {...form.register('isActive')} />Active product type</label> : null}
    </form>
  </CatalogEditor>
}
