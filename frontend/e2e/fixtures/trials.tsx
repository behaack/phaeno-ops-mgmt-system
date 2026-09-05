// Synthetic browser fixture, served only by the local test runner.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider, Outlet } from '@tanstack/react-router'
import { TrialScopePage } from '../../src/features/trials/TrialScopePage'
import { TrialDetailPage } from '../../src/features/trials/TrialDetailPage'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import type { SessionCapabilities } from '../../src/api/session'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'
applyThemeMode('auto')
const staff = new URLSearchParams(window.location.search).get('view') === 'scope'
const root = createRootRoute({ component: Outlet })
const route = createRoute({ getParentRoute: () => root, path: '/trial-projects/$trialId', component: () => <TrialDetailPage trialId="trial-1" /> })
const scopeRoute = createRoute({ getParentRoute: () => root, path: '/trial-projects/$trialId/scope', component: () => <TrialScopePage trialId="trial-1" /> })
const router = createRouter({ routeTree: root.addChildren([route, scopeRoute]), history: createMemoryHistory({ initialEntries: [staff ? '/trial-projects/trial-1/scope' : '/trial-projects/trial-1'] }) })
const session: PhaenoSessionContextValue = { authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null, selectedOrganizationId: 'prospect-1', selectedDepartmentId: 'research', setSelectedOrganizationId: () => {}, session: { state: 'ready', user: { id: 'member', email: 'member@example.test', firstName: 'Research', lastName: 'Administrator', status: 'Active' }, memberships: [], isPlatformAdmin: false, selectedOrganization: { organizationId: 'prospect-1', membershipId: 'membership', isAvailable: true }, capabilities: { canViewTrialProjects: true, canManageTrialProjects: staff } as SessionCapabilities } }
createRoot(document.getElementById('root')!).render(<PhaenoSessionContext.Provider value={session}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><RouterProvider router={router} /></QueryClientProvider></PhaenoSessionContext.Provider>)
