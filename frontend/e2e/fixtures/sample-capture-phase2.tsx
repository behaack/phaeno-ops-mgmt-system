// Synthetic identity and routes for local acceptance only; feature requests use real test-host controllers.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import type { SessionResponse } from '../../src/api/session'
import { VendorResultsWorkspacePage } from '../../src/features/lab-operations/VendorResultsWorkspacePage'
import { VendorResultsVersionPage } from '../../src/features/lab-operations/VendorResultsVersionPage'
import { MasterMixPage } from '../../src/features/lab-operations/MasterMixDetailV2'
import { ReagentRunPage } from '../../src/features/lab-operations/ReagentManufacturingWorkspace'
import { SampleInvestigation } from '../../src/features/lab-operations/SampleInvestigation'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

const params = new URLSearchParams(location.search)
applyThemeMode(params.get('theme') === 'dark' ? 'dark' : 'light')
const session: PhaenoSessionContextValue = { authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null,
  selectedOrganizationId: 'fixture-organization', setSelectedOrganizationId: () => {},
  session: { user: { id: 'phase2-fixture-user' }, capabilities: { canOperateLabWork: true, canManageLabOperations: true, canSuperviseLabWork: true } } as SessionResponse }
function Fixture() {
  const p = new URLSearchParams(location.search)
  if (p.get('mode') === 'mix') return <MasterMixPage mixId={p.get('id')!} />
  if (p.get('mode') === 'reagent') return <ReagentRunPage runId={p.get('id')!} />
  if (p.get('mode') === 'version') return <VendorResultsVersionPage batchId={p.get('batch')!} resultVersion={Number(p.get('version'))} />
  if (p.get('mode') === 'history') return <main className="mx-auto max-w-5xl p-4"><h1>Test sample history</h1><SampleInvestigation workOrderId={p.get('work')!} specimenId={p.get('specimen')!} /></main>
  return <VendorResultsWorkspacePage batchId={p.get('batch')!} />
}
const root = createRootRoute({ component: () => <PhaenoSessionContext.Provider value={session}><Outlet /></PhaenoSessionContext.Provider> })
const home = createRoute({ getParentRoute: () => root, path: '/e2e/fixtures/sample-capture-phase2.html', component: Fixture })
const saved = createRoute({ getParentRoute: () => root, path: '/lab-operations/batches/$batchId', component: () => <main className="p-4"><h1>Saved batch</h1></main> })
const router = createRouter({ routeTree: root.addChildren([home, saved]) })
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
