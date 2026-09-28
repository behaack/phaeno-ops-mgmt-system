import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { useSupplierCatalog, supplierCatalogKey, type CatalogSupplier, type SupplierProduct } from '#/api/supplier-catalog'
import { getLabOperationsError } from '#/api/lab-operations'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'
import { CatalogActions } from './CatalogActions'
import { SupplierProductDialog } from './SupplierCatalogDialogs'
import { SupplierCatalogStatusDialog } from './SupplierCatalogPage'

type ProductRow = { supplier: CatalogSupplier; product: SupplierProduct }

export function ProductCatalogPage({ supplierId, productId }: { supplierId?: string; productId?: string }) {
  const { session, authProvider } = usePhaenoSession()
  const cache = useQueryClient()
  const navigate = useNavigate()
  const allowed = Boolean(session?.capabilities.canManageOrderConfiguration)
  const query = useSupplierCatalog(allowed && authProvider !== 'mock')
  const filters = useSearch({ strict: false })
  const [search, setSearch] = useState(filters.productSearch ?? '')
  const [showInactive, setShowInactive] = useState(filters.productInactive ?? false)
  const [requestedProductTypeFilter, setProductTypeFilter] = useState(filters.productTypeFilter ?? '')
  const [choosingSupplier, setChoosingSupplier] = useState(false)
  const [newSupplierId, setNewSupplierId] = useState('')
  const [editing, setEditing] = useState<{ supplier: CatalogSupplier; product?: SupplierProduct } | null>(null)
  const [statusTarget, setStatusTarget] = useState<ProductRow | null>(null)
  if (!allowed) return <p>Product management requires a Phaeno platform administrator.</p>
  if (authProvider === 'mock') return <p>Use a connected Phaeno session to manage products.</p>
  if (query.isPending) return <p role="status">Loading products…</p>
  if (query.isError && !query.data) return <div><p role="alert">{getLabOperationsError(query.error, 'Products could not be loaded.')}</p><Button onClick={() => void query.refetch()}>Try again</Button></div>
  const suppliers = query.data ?? []
  const allRows = suppliers.flatMap(supplier => supplier.products.map(product => ({ supplier, product })))
  const current = supplierId && productId ? allRows.find(row => row.supplier.id === supplierId && row.product.id === productId) : undefined
  const productTypes = [...new Map(allRows.filter(({ product }) => product.productTypeIsActive).map(({ product }) => [product.productTypeId, { id: product.productTypeId, name: product.productTypeName }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name))
  const productTypeFilter = productTypes.some(type => type.id === requestedProductTypeFilter) ? requestedProductTypeFilter : ''
  const term = search.trim().toLocaleLowerCase()
  const rows = allRows.filter(({ supplier, product }) => (showInactive || supplier.isActive && product.isActive)
    && (!productTypeFilter || product.productTypeId === productTypeFilter)
    && `${supplier.name} ${product.productNumber} ${product.description} ${product.productTypeName}`.toLocaleLowerCase().includes(term))
  const availableSuppliers = suppliers.filter(item => item.isActive)
  const editRow = (row: ProductRow) => setEditing(row)
  const statusRow = (row: ProductRow) => setStatusTarget(row)
  function clearFilters() {
    setSearch(''); setProductTypeFilter(''); setShowInactive(false)
    void navigate({ to: '/purchasing', search: previous => ({ ...previous, section: 'products', productSearch: undefined, productInactive: undefined, productTypeFilter: undefined }), replace: true, resetScroll: false })
  }

  return <div className="space-y-5">
    {query.isError ? <p role="alert" className="text-sm text-destructive">Catalog refresh failed. <button className="cursor-pointer underline" onClick={() => void query.refetch()}>Retry</button></p> : null}
    {productId ? <Link className="text-sm text-primary underline underline-offset-2" to="/purchasing" search={{ section: 'products', productSearch: filters.productSearch, productInactive: filters.productInactive, productTypeFilter: productTypeFilter || undefined }}>← Back to products</Link> : null}
    {productId && !current ? <p>Product not found.</p> : current ? <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-2xl font-semibold">{current.product.productNumber}</h2><p className="mt-1 text-sm text-muted-foreground">{current.supplier.name} · {current.product.productTypeName}</p></div>
        <CatalogActions id={`product-actions-${current.product.id}`} name={current.product.productNumber} isActive={current.product.isActive} onEdit={() => editRow(current)} onStatus={() => statusRow(current)} />
      </div>
      <Card className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Product details</CardTitle></CardHeader><CardContent className="p-4"><dl className="grid gap-4 text-sm sm:grid-cols-2">
        <Fact label="Supplier"><Link className="text-primary underline" to="/purchasing/suppliers/$supplierId" params={{ supplierId: current.supplier.id }}>{current.supplier.name}</Link></Fact>
        <Fact label="Product type">{current.product.productTypeName}</Fact>
        <Fact label="Product name or SKU">{current.product.productNumber}</Fact>
        <Fact label="Description">{current.product.description}</Fact>
        <Fact label="Inventory unit">{current.product.defaultQuantityUnit ?? 'Needs configuration'}</Fact>
        {current.product.kind === 'ShippingContainer' ? <Fact label="Tube capacity">{current.product.tubeCapacity ?? 'Needs configuration'}</Fact> : null}
        <Fact label="Status"><Badge variant="secondary">{current.product.isActive ? 'Active' : 'Inactive'}</Badge></Fact>
      </dl></CardContent></Card>
    </> : <Card className="gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Products</CardTitle><CardDescription>Find purchased and Phaeno-made catalog products across suppliers.</CardDescription><CardAction><Button type="button" onClick={() => setChoosingSupplier(true)}><Plus data-icon="inline-start" /> New product</Button></CardAction>
      <div className="col-span-full mt-3 flex min-w-0 flex-wrap items-center gap-4"><Input id="purchasing-product-search" className="min-w-0 flex-1 basis-48" aria-label="Search products" placeholder="Search products or suppliers" value={search} onChange={event => setSearch(event.target.value)} /><select id="purchasing-product-type" aria-label="Product type" className="h-9 min-w-0 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-52" value={productTypeFilter} onChange={event => setProductTypeFilter(event.target.value)}><option value="">All product types</option>{productTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} />Show inactive</label>{search || productTypeFilter || showInactive ? <Button type="button" variant="ghost" onClick={clearFilters}>Clear filters</Button> : null}</div>
    </CardHeader><CardContent className="p-4">{rows.length ? <ul className="divide-y" aria-label="Products">{rows.map(row => <li key={row.product.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0 flex-1 basis-48"><div className="flex flex-wrap items-center gap-2"><Link className="font-medium text-primary underline-offset-2 wrap-anywhere hover:underline focus-visible:underline" to="/purchasing/products/$supplierId/$productId" params={{ supplierId: row.supplier.id, productId: row.product.id }} search={{ section: 'products', productSearch: search || undefined, productInactive: showInactive || undefined, productTypeFilter: productTypeFilter || undefined }}>{row.product.productNumber}</Link><Badge variant="outline" className="max-w-full whitespace-normal wrap-anywhere">{row.product.productTypeName}</Badge></div><p className="mt-1 text-sm">{row.product.description}</p><p className="mt-1 text-xs text-muted-foreground">{row.supplier.name} · {row.product.isActive ? 'Active' : 'Inactive'}{row.product.kind === 'ShippingContainer' ? ` · ${row.product.tubeCapacity ?? 'Capacity unconfigured'} tubes` : ''}</p></div><CatalogActions id={`product-actions-${row.product.id}`} name={row.product.productNumber} isActive={row.product.isActive} onEdit={() => editRow(row)} onStatus={() => statusRow(row)} /></li>)}</ul> : <p className="text-sm text-muted-foreground">{allRows.length ? 'No products match these filters.' : 'No products yet. Add a supplier, then add a product.'}</p>}</CardContent></Card>}
    {choosingSupplier ? <Dialog open onOpenChange={open => { if (!open) setChoosingSupplier(false) }}><DialogContent><DialogHeader><DialogTitle>Choose supplier</DialogTitle><DialogDescription>Each product belongs to one supplier, including the internal Phaeno producer.</DialogDescription></DialogHeader><div className="space-y-2 p-4"><Label htmlFor="new-product-supplier">Supplier *</Label><select id="new-product-supplier" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={newSupplierId} onChange={event => setNewSupplierId(event.target.value)}><option value="">Select supplier</option>{availableSuppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div><DialogFooter><span className="mr-auto text-xs text-muted-foreground">* Required</span><Button type="button" variant="outline" onClick={() => setChoosingSupplier(false)}>Cancel</Button><Button type="button" disabled={!newSupplierId} onClick={() => { const supplier = availableSuppliers.find(item => item.id === newSupplierId); setChoosingSupplier(false); if (supplier) setEditing({ supplier }) }}>Continue</Button></DialogFooter></DialogContent></Dialog> : null}
    {editing ? <SupplierProductDialog supplier={editing.supplier} product={editing.product ?? undefined} onClose={() => { setEditing(null); void cache.invalidateQueries({ queryKey: supplierCatalogKey }) }} /> : null}
    {statusTarget ? <SupplierCatalogStatusDialog target={{ kind: 'product', supplier: statusTarget.supplier, product: statusTarget.product }} fallbackId="purchasing-product-search" onClose={() => setStatusTarget(null)} /> : null}
  </div>
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className="mt-1">{children}</dd></div>
}
