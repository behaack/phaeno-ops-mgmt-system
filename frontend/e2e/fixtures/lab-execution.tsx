// Synthetic browser fixture only; never imported by production routes.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { LabExecutionPage } from '../../src/features/lab-operations/LabExecutionPage'
import { LabWorkOrderPage } from '../../src/features/lab-operations/LabWorkOrderPage'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import { configureApiAuth } from '../../src/api/client'
import { noSessionCapabilities } from '../../src/test-helpers/session'
import { executionId, executionWorkId, recordingUserId } from '../../src/test-helpers/lab-execution'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

applyThemeMode('auto')
configureApiAuth({ getSelectedOrganizationId: () => 'training-phaeno' })
const session: PhaenoSessionContextValue = {
  authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null, selectedOrganizationId: 'training-phaeno', setSelectedOrganizationId: () => undefined,
  session: {
    state: 'ready', user: { id: recordingUserId, email: 'operator@example.test', firstName: 'Training', lastName: 'Operator', status: 'Active' },
    memberships: [{ membershipId: 'training', organizationId: 'training-phaeno', organizationName: 'Phaeno', organizationKind: 'Phaeno', isOrganizationAdmin: false }],
    isPlatformAdmin: false, selectedOrganization: { organizationId: 'training-phaeno', membershipId: 'training', isAvailable: true },
    capabilities: { ...noSessionCapabilities, canManageLabOperations: true, canOperateLabWork: true },
  },
}
const root = createRootRoute({ component: Outlet })
const job = () => <LabWorkOrderPage workOrderId={executionWorkId} selectedTab="execution" />
const routes = [
  createRoute({ getParentRoute: () => root, path: '/e2e/fixtures/lab-execution.html', component: job }),
  createRoute({ getParentRoute: () => root, path: '/lab-operations/$workOrderId', component: job }),
  createRoute({ getParentRoute: () => root, path: '/lab-operations/executions/$executionId', component: () => <LabExecutionPage executionId={executionId} /> }),
]
const router = createRouter({ routeTree: root.addChildren(routes) })
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><PhaenoSessionContext.Provider value={session}><RouterProvider router={router} /></PhaenoSessionContext.Provider></QueryClientProvider>)
