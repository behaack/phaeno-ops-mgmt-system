// Isolated browser fixture. The companion tests intercept every API request.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { configureApiAuth } from '../../src/api/client'
import { applyThemeMode } from '../../src/components/theme-mode'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import { SampleShippingDetailPage } from '../../src/features/sample-shipping/SampleShippingDetailPage'
import { LocationKitInventoryPanel } from '../../src/features/sample-shipping/LocationKitInventoryPanel'
import { noSessionCapabilities } from '../../src/test-helpers/session'
import '../../src/styles.css'

const parameters = new URLSearchParams(window.location.search)
const member = parameters.get('role') === 'member'
configureApiAuth({ getSelectedOrganizationId: () => 'org-1', getSelectedDepartmentId: () => 'department-1' })
applyThemeMode('auto')
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
window.addEventListener('test-inventory-refresh', () => { void client.invalidateQueries({ queryKey: ['transportation-kit-supply'] }); void client.invalidateQueries({ queryKey: ['sample-shipment-packing'] }) })
const context: PhaenoSessionContextValue = {
  authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null,
  selectedOrganizationId: 'org-1', selectedDepartmentId: 'department-1', setSelectedOrganizationId: () => undefined,
  session: {
    state: 'ready', user: { id: 'user-1', email: 'inventory@example.test', firstName: 'Test', lastName: 'User', status: 'Active' },
    memberships: [{ membershipId: 'membership-1', organizationId: 'org-1', organizationName: 'Synthetic Customer', organizationKind: 'Customer', isOrganizationAdmin: !member }],
    isPlatformAdmin: false,
    selectedOrganization: { organizationId: 'org-1', membershipId: 'membership-1', isAvailable: true },
    selectedDepartment: { departmentId: 'department-1', organizationId: 'org-1', isAvailable: true, isDepartmentAdmin: !member },
    capabilities: { ...noSessionCapabilities, canViewSampleShipping: true, canManageSampleShipping: !member },
  },
}
const root = createRootRoute({ component: () => <><header className="border-b px-4 py-2 text-center text-xs">Synthetic inventory test · No physical fulfillment</header><Outlet /></> })
const shipmentRoute = createRoute({ getParentRoute: () => root, path: '/sample-shipping/$shipmentId', component: () => <SampleShippingDetailPage shipmentId={shipmentRoute.useParams().shipmentId} /> })
const jobRoute = createRoute({ getParentRoute: () => root, path: '/lab-services/$orderId', component: () => <main><h1>Synthetic Job</h1></main> })
const locationRoute = createRoute({ getParentRoute: () => root, path: '/location', component: () => <main className="page-wrap space-y-5 px-4 py-8"><h1 className="text-3xl font-semibold">Main laboratory</h1><LocationKitInventoryPanel locationId="location-1" organizationId="org-1" departmentId="department-1" canManage={!member} /></main> })
const router = createRouter({ routeTree: root.addChildren([shipmentRoute, jobRoute, locationRoute]), history: createMemoryHistory({ initialEntries: [parameters.has('location') ? '/location' : `/sample-shipping/${parameters.get('shipment') ?? 'pool-1'}`] }) })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><PhaenoSessionContext.Provider value={context}><RouterProvider router={router} /></PhaenoSessionContext.Provider></QueryClientProvider>)
