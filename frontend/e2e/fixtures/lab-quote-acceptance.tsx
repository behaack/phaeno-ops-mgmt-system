// Synthetic records and an in-memory transport: no operational API requests.
import { createRoot } from 'react-dom/client'
import { useSyncExternalStore } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider, type AnyRouter } from '@tanstack/react-router'
import { api } from '../../src/api/client'
import type { LabServiceOrder } from '../../src/api/order-management'
import type { LabOrderKitWorkspace } from '../../src/api/transportation-kit-requests'
import { LabServiceDetailPage } from '../../src/features/orders/LabServiceDetailPage'
import { parseLabJobWorkspaceSearch, type LabJobWorkspaceSearch } from '../../src/features/orders/lab-job-workspace-search'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import { noSessionCapabilities } from '../../src/test-helpers/session'
import { phaseShippingOrder, shippingPhasePlan, emptyPhasePairs } from '../../src/test-helpers/lab-phase-shipping'
import { deliveryLocationFixture } from '../../src/test-helpers/transportation-kit-requests'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

applyThemeMode('auto')
let order: LabServiceOrder = { ...phaseShippingOrder, status: 'QuoteIssued', placedAt: null, samples: [], canEdit: false,
  canSubmit: false, canWithdraw: false, canAcceptQuote: true, canRequestCancellation: false,
  quotes: phaseShippingOrder.quotes.map(quote => ({ ...quote, deliveryTargetBusinessDays: 14 })) }
const supply: LabOrderKitWorkspace = { requests: [], locations: [deliveryLocationFixture], phases: shippingPhasePlan.phases.map(phase => ({
  phaseId: phase.id, phaseName: phase.name, sampleCount: phase.sampleCount, deliveryLocationId: deliveryLocationFixture.id,
  receivedStock: [], canRequest: true, blockedReason: null,
  recommendation: { tubeCount: 5, containerCount: 1, totalCapacity: 20, unusedCapacity: 15, unallocatedTubes: 0,
    isComplete: true, containers: [], explanation: 'One compatible kit for this phase.' },
})) }
let accepted = 0
let kitRequests = 0
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const snapshot = () => `Accepted decisions: ${accepted} · Kit requests: ${kitRequests}`
api.defaults.adapter = async config => {
  const url = config.url ?? ''
  let data: unknown
  if (config.method === 'post' && url.endsWith('/accept')) {
    order = { ...order, version: order.version + 1, status: 'PlacedAwaitingSamples', placedAt: '2026-10-02T12:00:00Z',
      canAcceptQuote: false, canRequestCancellation: true, quotes: order.quotes.map(quote => ({ ...quote, status: 'Accepted', acceptedAt: '2026-10-02T12:00:00Z' })) }
    accepted += 1
    listeners.forEach(listener => listener())
    data = order
  } else if (config.method === 'post') {
    kitRequests += 1
    listeners.forEach(listener => listener())
    throw new Error('This fixture does not submit kit requests.')
  } else if (url.endsWith('/phase-kit-supply')) data = supply
  else if (url.endsWith('/sample-tube-pairs')) data = emptyPhasePairs
  else if (url.endsWith('/phases')) data = shippingPhasePlan
  else if (url === `/lab-service-orders/${order.id}`) data = order
  else if (url.endsWith('/result-packages') || url === '/sample-shipping') data = []
  else throw new Error(`Unconfigured synthetic read: ${url}`)
  return { config, headers: {}, status: 200, statusText: 'OK', data: { success: true, data, error: null, meta: {} } }
}
const context = { authProvider: 'clerk', session: {
  selectedOrganization: { organizationId: order.organizationId }, selectedDepartment: { purchaseOrderRequired: true },
  capabilities: { ...noSessionCapabilities, canViewLabServiceOrders: true, canAcceptLabServiceQuotes: true,
    canViewSampleShipping: true, canManageSampleShipping: true, canRequestLabServiceCancellation: true },
} } as PhaenoSessionContextValue

function Frame() {
  const counts = useSyncExternalStore(subscribe, snapshot)
  return <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
    <p className="text-sm text-muted-foreground">Simulated acceptance · all records and requests stay in this browser fixture</p>
    <p role="status" data-testid="synthetic-operations" className="text-sm">{counts}</p><Outlet />
  </main>
}
const root = createRootRoute({ component: Frame })
const detail = createRoute({ getParentRoute: () => root, path: '/e2e/fixtures/lab-quote-acceptance.html',
  validateSearch: parseLabJobWorkspaceSearch, component: Detail })
function Detail() {
  const workspace = detail.useSearch()
  // Match the production route's saved-navigation contract, with real blockers.
  return <LabServiceDetailPage orderId={order.id} workspace={workspace} onWorkspaceChange={(patch, options) => router.navigate<AnyRouter, string>({
    to: '/e2e/fixtures/lab-quote-acceptance.html',
    search: (previous: LabJobWorkspaceSearch) => ({ ...previous, ...patch }), resetScroll: false, ignoreBlocker: options?.afterSave === true,
  })} />
}
const router = createRouter({ routeTree: root.addChildren([detail]) })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
  <PhaenoSessionContext.Provider value={context}><RouterProvider router={router} /></PhaenoSessionContext.Provider>
</QueryClientProvider>)
