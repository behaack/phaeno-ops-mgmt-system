// Connected-role browser fixture. The companion spec intercepts all API requests.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { configureApiAuth } from '../../src/api/client'
import { applyThemeMode } from '../../src/components/theme-mode'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import { SupplierCatalogPage } from '../../src/features/lab-operations/SupplierCatalogPage'
import { StandardKitDetailPage } from '../../src/features/orders/stock-kits/StandardKitDetailPage'
import { StandardKitInventoryPanel } from '../../src/features/orders/stock-kits/StandardKitInventoryPanel'
import { noSessionCapabilities } from '../../src/test-helpers/session'
import '../../src/styles.css'

const params = new URLSearchParams(window.location.search)
configureApiAuth({ getSelectedOrganizationId: () => 'phaeno-org', getSelectedDepartmentId: () => null })
applyThemeMode('auto')
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
const context: PhaenoSessionContextValue = {
  authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null,
  selectedOrganizationId: 'phaeno-org', selectedDepartmentId: null,
  setSelectedOrganizationId: () => undefined,
  session: {
    state: 'ready', user: { id: 'staff-1', email: 'kit-admin@example.test', firstName: 'Kit', lastName: 'Admin', status: 'Active' },
    memberships: [{ membershipId: 'membership-1', organizationId: 'phaeno-org', organizationName: 'Phaeno', organizationKind: 'Phaeno', isOrganizationAdmin: true }],
    isPlatformAdmin: true,
    selectedOrganization: { organizationId: 'phaeno-org', membershipId: 'membership-1', isAvailable: true },
    selectedDepartment: null,
    capabilities: { ...noSessionCapabilities, canManageOrderConfiguration: true },
  },
}
const root = createRootRoute({ component: () => <><header className="border-b px-4 py-2 text-center text-xs">Synthetic kit acceptance · No physical fulfillment</header><Outlet /></> })
const inventory = createRoute({ getParentRoute: () => root, path: '/lab-operations', component: () => <main className="page-wrap px-4 py-8"><h1 className="mb-5 text-2xl font-semibold">Transportation kits</h1><StandardKitInventoryPanel apiEnabled /></main> })
const supplier = createRoute({ getParentRoute: () => root, path: '/lab-operations/suppliers/$supplierId', component: () => <main><SupplierCatalogPage supplierId={supplier.useParams().supplierId} /></main> })
const detail = createRoute({ getParentRoute: () => root, path: '/lab-operations/stock-kits/$kitId', component: () => <StandardKitDetailPage kitId={detail.useParams().kitId} /> })
const router = createRouter({ routeTree: root.addChildren([inventory, supplier, detail]), history: createMemoryHistory({ initialEntries: [params.get('start') === 'catalog' ? '/lab-operations/suppliers/phaeno' : '/lab-operations'] }) })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><PhaenoSessionContext.Provider value={context}><RouterProvider router={router} /></PhaenoSessionContext.Provider></QueryClientProvider>)
