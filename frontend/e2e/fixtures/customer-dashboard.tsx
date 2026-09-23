// Browser fixture only; never imported by production routes.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { configureApiAuth } from '../../src/api/client'
import type { CustomerLabDashboardView } from '../../src/api/order-management'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import { CustomerDashboardMetrics } from '../../src/features/dashboard/CustomerDashboardMetrics'
import { CustomerLabRequestsCard } from '../../src/features/dashboard/CustomerLabRequestsCard'
import { useCustomerDashboardQuery } from '../../src/features/dashboard/customer-dashboard-query'
import { noSessionCapabilities } from '../../src/test-helpers/session'
import '../../src/styles.css'

configureApiAuth({ getSelectedOrganizationId: () => 'customer', getSelectedDepartmentId: () => 'general' })
const session: PhaenoSessionContextValue = {
  authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null,
  selectedOrganizationId: 'customer', setSelectedOrganizationId: () => undefined,
  selectedDepartmentId: 'general', setSelectedDepartmentId: () => undefined,
  session: { state: 'ready', user: { id: 'member', email: 'member@example.test', firstName: 'Test', lastName: 'Member', status: 'Active' },
    memberships: [{ membershipId: 'member', organizationId: 'customer', organizationName: 'Test Customer', organizationKind: 'Customer', isOrganizationAdmin: false }],
    isPlatformAdmin: false, selectedOrganization: { organizationId: 'customer', membershipId: 'member', isAvailable: true },
    capabilities: { ...noSessionCapabilities, canViewLabServiceOrders: true } },
}

function DashboardFixture() {
  const [view, setView] = useState<CustomerLabDashboardView>('active')
  const query = useCustomerDashboardQuery(view, 1, 'customer', 'general', true)
  return <main className="mx-auto max-w-4xl space-y-6 p-4">
    <CustomerDashboardMetrics view={view} onSelect={setView} query={query} enabled />
    <CustomerLabRequestsCard view={view} page={1} onPageChange={() => undefined} query={query} />
  </main>
}

const root = createRootRoute({ component: Outlet })
root.addChildren([
  createRoute({ getParentRoute: () => root, path: '/e2e/fixtures/customer-dashboard.html', component: DashboardFixture }),
  createRoute({ getParentRoute: () => root, path: '/lab-services/$orderId', component: () => <div>Job detail fixture</div> }),
])
const router = createRouter({ routeTree: root })
createRoot(document.getElementById('root')!).render(
  <PhaenoSessionContext.Provider value={session}>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </PhaenoSessionContext.Provider>,
)
