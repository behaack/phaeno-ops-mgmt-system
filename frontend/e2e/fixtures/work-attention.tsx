// Deterministic browser acceptance only: all HTTP requests are intercepted by the spec.
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider, Outlet, Link } from '@tanstack/react-router'
import { api, configureApiAuth } from '../../src/api/client'
import type { SessionResponse } from '../../src/api/session'
import { PhaenoSessionContext } from '../../src/features/auth/session-context'
import { CustomerLocaleContext } from '../../src/features/customer-i18n/customer-text'
import { WorkDashboard } from '../../src/features/work-attention/WorkDashboard'
import { WorkBell } from '../../src/features/work-attention/WorkBell'
import { WorkAttentionRefresh } from '../../src/features/work-attention/WorkAttentionRefresh'
import { PortalConfirmation } from '../../src/components/PortalConfirmation'
import { useModalDraftGuard } from '../../src/features/orders/use-modal-draft-guard'
import { Button } from '../../src/components/ui/button'
import { Input } from '../../src/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../src/components/ui/dialog'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

const settings = new URLSearchParams(location.search)
const customer = settings.get('customer') === 'true'
let organization = 'organization-a'
configureApiAuth({ getSelectedOrganizationId: () => organization, getSelectedDepartmentId: () => 'research' })
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

function DraftExample() {
  const [open, setOpen] = useState(false), [value, setValue] = useState('')
  const guard = useModalDraftGuard(value !== '', false)
  return <><Button variant="outline" onClick={() => setOpen(true)}>Open draft example</Button><Dialog open={open} onOpenChange={next => { if (!next) void guard.close(() => { setOpen(false); setValue('') }) }}>
    <DialogContent><DialogHeader><DialogTitle>Draft example</DialogTitle></DialogHeader><div><DialogDescription>Keep entered content until you explicitly discard it.</DialogDescription><label htmlFor="example-note">Draft note</label><Input id="example-note" value={value} onChange={event => setValue(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => void guard.close(() => { setOpen(false); setValue('') })}>Cancel example</Button></DialogFooter></DialogContent>
  </Dialog></>
}
function Frame() {
  return <><WorkAttentionRefresh /><header className="flex flex-wrap items-center gap-3 border-b p-4"><h2>Acceptance workspace</h2><WorkBell /><DraftExample /></header><Outlet /><PortalConfirmation /></>
}
function Record() {
  const mutation = useMutation({ mutationFn: () => api.post('/fixture/complete') })
  return <main className="page-wrap p-4"><h1>Exact CRM task</h1><Button onClick={() => mutation.mutate()}>Complete fixture task</Button><Button asChild variant="outline"><Link to="/">Return to work</Link></Button></main>
}
const root = createRootRoute({ component: Frame })
const home = createRoute({ getParentRoute: () => root, path: '/', validateSearch: search => search, component: WorkDashboard })
const full = createRoute({ getParentRoute: () => root, path: '/dashboard/attention', validateSearch: search => search, component: () => <WorkDashboard full /> })
const record = createRoute({ getParentRoute: () => root, path: '/crm/tasks', validateSearch: search => search, component: Record })
const router = createRouter({ routeTree: root.addChildren([home, full, record]), history: createMemoryHistory({ initialEntries: [`/?workPage=${Number(settings.get('workPage') ?? 1)}`] }) })
function Harness() {
  const [selected, select] = useState(organization)
  const session = { state: 'ready', user: { id: 'staff-user', email: 'fixture@example.invalid', firstName: 'Fixture', lastName: 'Actor', status: 'Active' }, isPlatformAdmin: false,
    memberships: [{ organizationId: selected, organizationKind: customer ? 'Customer' : 'Phaeno' }], capabilities: {}, selectedOrganization: { organizationId: selected, isAvailable: true }, selectedDepartment: { departmentId: 'research', isAvailable: true } } as SessionResponse
  return <PhaenoSessionContext.Provider value={{ authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null, session, selectedOrganizationId: selected, selectedDepartmentId: 'research', setSelectedOrganizationId: () => {} }}>
    <CustomerLocaleContext.Provider value={{ customer, pseudo: customer && settings.get('pseudo') === 'true', locale: 'en-US' }}><QueryClientProvider client={client}>
      <Button variant="outline" onClick={() => { organization = selected === 'organization-a' ? 'organization-b' : 'organization-a'; select(organization) }}>Switch fixture organization</Button><RouterProvider router={router} />
    </QueryClientProvider></CustomerLocaleContext.Provider>
  </PhaenoSessionContext.Provider>
}
applyThemeMode('auto')
await router.load()
createRoot(document.getElementById('root')!).render(<Harness />)
