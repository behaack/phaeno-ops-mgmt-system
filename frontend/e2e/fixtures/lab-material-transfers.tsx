// Browser fixture only; never imported by production routes.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { SequencingTubesDialog } from '../../src/features/lab-operations/SequencingTubesDialog'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import { configureApiAuth } from '../../src/api/client'
import { noSessionCapabilities } from '../../src/test-helpers/session'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

applyThemeMode('auto')
configureApiAuth({ getSelectedOrganizationId: () => 'training-phaeno' })
const session: PhaenoSessionContextValue = {
  authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null, selectedOrganizationId: 'training-phaeno', setSelectedOrganizationId: () => undefined,
  session: { state: 'ready', user: { id: 'operator', email: 'operator@example.test', firstName: 'Training', lastName: 'Operator', status: 'Active' }, memberships: [{ membershipId: 'training', organizationId: 'training-phaeno', organizationName: 'Phaeno', organizationKind: 'Phaeno', isOrganizationAdmin: false }],
    isPlatformAdmin: false, selectedOrganization: { organizationId: 'training-phaeno', membershipId: 'training', isAvailable: true }, capabilities: { ...noSessionCapabilities, canManageLabOperations: true, canOperateLabWork: true } },
}
const root = createRootRoute({ component: Outlet })
root.addChildren([createRoute({ getParentRoute: () => root, path: '/e2e/fixtures/lab-material-transfers.html', component: () => <SequencingTubesDialog batchId="test-batch" batchName="TEST material transfer" canManage onClose={() => undefined} onChanged={async () => undefined} /> })])
const router = createRouter({ routeTree: root })
createRoot(document.getElementById('root')!).render(<PhaenoSessionContext.Provider value={session}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><RouterProvider router={router} /></QueryClientProvider></PhaenoSessionContext.Provider>)
