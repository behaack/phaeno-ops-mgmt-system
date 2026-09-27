import { useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, FlaskConical, Package, RefreshCw } from 'lucide-react'

import { getLabOperationsDashboard, getLabOperationsError } from '#/api/lab-operations'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { usePhaenoSession } from '#/features/auth/session-context'
import { MaterialList } from './LabOperationsPage'
import { MaterialLotCreateDialog } from './MaterialLotCreateDialog'
import { ProductCatalogWorkspace } from './ProductCatalogWorkspace'
import { SupplierCatalogPage } from './SupplierCatalogPage'

export type PurchasingSection = 'suppliers' | 'products' | 'materials'

export const purchasingSections: ReadonlyArray<WorkspaceSidebarItem<PurchasingSection>> = [
  { value: 'suppliers', label: 'Suppliers', description: 'Vendors and internal production', icon: Building2 },
  { value: 'products', label: 'Products', description: 'Catalog products and product types', icon: Package },
  { value: 'materials', label: 'Purchased materials', description: 'Material lots, prepared reagents, and QC', icon: FlaskConical },
]

export function parsePurchasingSection(value: unknown): PurchasingSection | undefined {
  return value === 'suppliers' || value === 'products' || value === 'materials' ? value : undefined
}

export function PurchasingWorkspace({ section, onSectionChange, children, productTab, onProductTabChange }: {
  section: PurchasingSection
  onSectionChange: (section: PurchasingSection) => void
  children?: ReactNode
  productTab?: 'products' | 'product-types'
  onProductTabChange?: (tab: 'products' | 'product-types') => void
}) {
  const { session } = usePhaenoSession()
  const canViewCatalog = Boolean(session?.capabilities.canManageOrderConfiguration)
  const canViewMaterials = Boolean(session?.capabilities.canManageLabOperations)
  return <main className="py-8">
    <WorkspaceSidebar workspaceLabel="Purchasing" items={purchasingSections} value={section} onValueChange={onSectionChange}>
      <div className="page-wrap space-y-5 px-4 pt-6 lg:pt-0">
        <header className="max-w-3xl">
          <h1 className="text-3xl font-semibold">Purchasing</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Manage suppliers, catalog products, and material lots used in laboratory work and transportation kits.</p>
        </header>
        {children ?? (section === 'materials'
          ? canViewMaterials ? <PurchasedMaterialsSection /> : <p>Purchased materials require Phaeno laboratory access.</p>
          : canViewCatalog ? section === 'suppliers' ? <SupplierCatalogPage /> : <ProductCatalogWorkspace tab={productTab} onTabChange={onProductTabChange} />
            : <p>Supplier and product management requires a Phaeno platform administrator.</p>)}
      </div>
    </WorkspaceSidebar>
  </main>
}

function PurchasedMaterialsSection() {
  const { session, authProvider } = usePhaenoSession()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const enabled = Boolean(session?.capabilities.canManageLabOperations) && authProvider !== 'mock'
  const query = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['lab-operations'] })
  return <>
    {authProvider === 'mock' ? <p>Use a connected Phaeno session to manage material lots.</p> : query.isError ? <Alert variant="destructive"><AlertTitle>Purchased materials could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh the page and try again.')}</AlertDescription></Alert> : null}
    {enabled && query.isPending ? <p role="status">Loading material lots…</p> : query.data ? <>
      <div className="flex justify-end"><Button type="button" variant="outline" disabled={query.isFetching} onClick={() => void refresh()}><RefreshCw data-icon="inline-start" /> Refresh</Button></div>
      <MaterialList items={query.data.materialLots} canManage={Boolean(session?.capabilities.canOperateLabWork)} canApprove={Boolean(session?.capabilities.canSuperviseLabWork)} onCreate={() => setCreating(true)} refresh={refresh} />
      <MaterialLotCreateDialog open={creating} definitions={query.data.materialDefinitions} suppliers={query.data.suppliers} storageLocations={query.data.storageLocations} materialLots={query.data.materialLots} onOpenChange={setCreating} onSaved={async () => { setCreating(false); await refresh() }} />
    </> : null}
  </>
}
