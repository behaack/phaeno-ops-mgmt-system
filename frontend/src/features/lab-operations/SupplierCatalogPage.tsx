import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Link, useSearch } from '@tanstack/react-router'
import { useSupplierCatalog, saveSupplier, saveSupplierProduct, supplierCatalogKey, type CatalogSupplier, type SupplierProduct } from '#/api/supplier-catalog'
import { getLabOperationsError } from '#/api/lab-operations'
import { usePhaenoSession } from '#/features/auth/session-context'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { CatalogActions, CatalogStatusConfirmation } from './CatalogActions'
import { SupplierDialog, SupplierProductDialog } from './SupplierCatalogDialogs'

export function SupplierCatalogPage({ supplierId }: { supplierId?: string }) {
  const { session, authProvider } = usePhaenoSession()
  const allowed = Boolean(session?.capabilities.canManageOrderConfiguration)
  const query = useSupplierCatalog(allowed && authProvider !== 'mock')
  const savedFilters = useSearch({ strict: false })
  const [search, setSearch] = useState(supplierId ? '' : savedFilters.supplierSearch ?? '')
  const [showInactive, setShowInactive] = useState(supplierId ? false : savedFilters.supplierInactive ?? false)
  const [supplierEditor, setSupplierEditor] = useState<CatalogSupplier | 'new' | null>(null)
  const [statusTarget, setStatusTarget] = useState<CatalogStatusTarget | null>(null)
  const [productEditor, setProductEditor] = useState<SupplierProduct | 'new' | null>(null)
  if (!allowed) return <p>Supplier and product management requires a Phaeno platform administrator.</p>
  if (authProvider === 'mock') return <p>Use a connected Phaeno session to manage suppliers and products.</p>
  if (query.isPending) return <p role="status">Loading suppliers and products…</p>
  if (query.isError && !query.data) return <div className="space-y-3"><p role="alert">{getLabOperationsError(query.error, 'The catalog could not be loaded.')}</p><Button onClick={() => void query.refetch()}>Try again</Button></div>
  const data = query.data ?? []
  const supplier = supplierId ? data.find(item => item.id === supplierId) : undefined
  if (supplierId && !supplier) return <div><Link to="/lab-operations" search={{ section: 'suppliers', supplierTab: 'suppliers', supplierSearch: savedFilters.supplierSearch, supplierInactive: savedFilters.supplierInactive }}>Back to suppliers</Link><p>Supplier not found.</p></div>
  const term = search.trim().toLocaleLowerCase()
  const suppliers = data.filter(item => (showInactive || item.isActive) && `${item.name} ${item.products.map(p => `${p.productNumber} ${p.description}`).join(' ')}`.toLocaleLowerCase().includes(term))
  const products = supplier?.products.filter(item => (showInactive || item.isActive) && `${item.productNumber} ${item.description}`.toLocaleLowerCase().includes(term)) ?? []
  return <div className={supplierId ? 'page-wrap space-y-5 px-4 py-8' : 'space-y-5'}>
    {query.isError ? <p role="alert" className="text-sm text-destructive">Catalog refresh failed. Your current edits are retained. <button className="cursor-pointer underline" onClick={() => void query.refetch()}>Retry</button></p> : null}
    {supplier ? <>
      <Link className="text-sm text-primary underline" to="/lab-operations" search={{ section: 'suppliers', supplierTab: 'suppliers', supplierSearch: savedFilters.supplierSearch, supplierInactive: savedFilters.supplierInactive }}>Back to Suppliers &amp; products</Link>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold wrap-anywhere">{supplier.name}</h1><Badge variant="secondary" className="mt-2">{supplier.isActive ? 'Active' : 'Inactive'}</Badge></div><CatalogActions id={`supplier-actions-${supplier.id}`} name={supplier.name} isActive={supplier.isActive} onEdit={() => setSupplierEditor(supplier)} onStatus={() => setStatusTarget({ kind: 'supplier', supplier })} /></div>
      {!supplier.isActive ? <p className="text-sm text-muted-foreground">This supplier and its products are unavailable for new kits. Existing kit records are preserved.</p> : null}
    </> : null}
    <Card className="gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>{supplier ? 'Products' : 'Suppliers & products'}</CardTitle><CardDescription>{supplier ? 'Product names, descriptions and types for laboratory work and kits.' : 'Manage vendors and their reagents, tubes, shipping containers, and other products.'}</CardDescription><CardAction><Button type="button" disabled={supplier ? !supplier.isActive : false} onClick={() => supplier ? setProductEditor('new') : setSupplierEditor('new')}><Plus data-icon="inline-start" />{supplier ? 'New product' : 'New supplier'}</Button></CardAction>
      <div className="col-span-full mt-3 flex min-w-0 flex-wrap items-end gap-4"><div className="min-w-0 flex-1 basis-48"><Label htmlFor="supplier-catalog-search">{supplier ? 'Search products' : 'Search suppliers or products'}</Label><Input id="supplier-catalog-search" className="mt-2" value={search} onChange={e => setSearch(e.target.value)} /></div><label className="flex cursor-pointer items-center gap-2 py-2 text-sm"><input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />Show inactive</label></div>
    </CardHeader>
      <CardContent className="space-y-4 p-4">
        {supplier ? products.length ? <ul className="divide-y" aria-label="Products">{products.map(product => <li key={product.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0 flex-1 basis-48"><p className="font-medium wrap-anywhere">{product.productNumber}</p><p className="mt-1 wrap-anywhere">{product.description}</p><p className="mt-1 text-sm text-muted-foreground">{product.productTypeName}{product.productTypeIsActive ? '' : ' (type inactive)'} · {product.isActive ? 'Active' : 'Inactive'} · {product.canExpire ? 'Can expire' : 'Expiration not required'}</p></div><CatalogActions id={`product-actions-${product.id}`} name={product.productNumber} isActive={product.isActive} onEdit={() => setProductEditor(product)} onStatus={() => setStatusTarget({ kind: 'product', supplier, product })} /></li>)}</ul> : <p className="text-muted-foreground">{supplier.products.length ? 'No products match these filters.' : 'No products yet. Add a product with its name, description and type.'}</p>
          : suppliers.length ? <ul className="divide-y" aria-label="Suppliers">{suppliers.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><Link className="font-medium text-primary underline wrap-anywhere" to="/lab-operations/suppliers/$supplierId" params={{ supplierId: item.id }} search={{ section: 'suppliers', supplierTab: 'suppliers', supplierSearch: search || undefined, supplierInactive: showInactive || undefined }}>{item.name}</Link><p className="mt-1 text-sm text-muted-foreground">{item.products.filter(p => p.isActive).length} active products</p></div><div className="flex items-center gap-3"><Badge variant="secondary">{item.isActive ? 'Active' : 'Inactive'}</Badge><CatalogActions id={`supplier-actions-${item.id}`} name={item.name} isActive={item.isActive} onEdit={() => setSupplierEditor(item)} onStatus={() => setStatusTarget({ kind: 'supplier', supplier: item })} /></div></li>)}</ul> : <p className="text-muted-foreground">{data.length ? 'No suppliers match these filters.' : 'No suppliers yet. Add a supplier, then add its products.'}</p>}
      </CardContent>
    </Card>
    {supplierEditor ? <SupplierDialog supplier={supplierEditor === 'new' ? undefined : supplierEditor} onClose={() => setSupplierEditor(null)} /> : null}
    {supplier && productEditor ? <SupplierProductDialog supplier={supplier} product={productEditor === 'new' ? undefined : productEditor} onClose={() => setProductEditor(null)} /> : null}
    {statusTarget ? <SupplierCatalogStatusDialog target={statusTarget} onClose={() => setStatusTarget(null)} /> : null}
  </div>
}

type CatalogStatusTarget = { kind: 'supplier'; supplier: CatalogSupplier } | { kind: 'product'; supplier: CatalogSupplier; product: SupplierProduct }
function SupplierCatalogStatusDialog({ target, onClose }: { target: CatalogStatusTarget; onClose: () => void }) {
  const cache = useQueryClient()
  const record = target.kind === 'supplier' ? target.supplier : target.product
  const name = target.kind === 'supplier' ? target.supplier.name : target.product.productNumber
  const description = target.kind === 'supplier'
    ? record.isActive ? 'This supplier will no longer be available for new kit or material-lot selections, and its products cannot be selected for new kits. Existing records are preserved.' : 'This supplier will be available again. Its products must also be active and have active, suitable types for kit selection.'
    : record.isActive ? 'This product will no longer be available for new kit selections. Existing kit records are preserved.' : 'This product will be active again. Kit selection also requires an active supplier and an active, suitable product type.'
  return <CatalogStatusConfirmation name={name} isActive={record.isActive} description={description} actionId={`${target.kind}-actions-${record.id}`} fallbackId="supplier-catalog-search" onClose={onClose} onSave={async () => {
    if (target.kind === 'supplier') {
      const updated = await saveSupplier({ name: target.supplier.name, isActive: !target.supplier.isActive, version: target.supplier.version }, target.supplier.id)
      cache.setQueryData<CatalogSupplier[]>(supplierCatalogKey, previous => previous?.map(item => item.id === updated.id ? updated : item))
    } else {
      const p = target.product
      const updated = await saveSupplierProduct(target.supplier.id, { productNumber: p.productNumber, description: p.description, productTypeId: p.productTypeId, canExpire: p.canExpire ?? false, isActive: !p.isActive, version: p.version }, p.id)
      cache.setQueryData<CatalogSupplier[]>(supplierCatalogKey, previous => previous?.map(item => item.id === target.supplier.id ? { ...item, products: item.products.map(product => product.id === updated.id ? updated : product) } : item))
    }
  }} />
}
