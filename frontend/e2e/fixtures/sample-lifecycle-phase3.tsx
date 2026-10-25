// Isolated synthetic session; all feature data/writes use real MVC/EF test-host endpoints.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import type { SessionResponse } from '../../src/api/session'
import { PortalConfirmation } from '../../src/components/PortalConfirmation'
import { LabTubePage } from '../../src/features/lab-operations/LabTubePage'
import { PhysicalRetentionQueue } from '../../src/features/lab-operations/PhysicalRetentionQueue'
import { StorageBoxDialog } from '../../src/features/lab-operations/StorageBoxDialog'
import { PreparationStepDialog } from '../../src/features/lab-operations/PreparationStepDialog'
import { MasterMixPage } from '../../src/features/lab-operations/MasterMixDetailV2'
import { SampleInvestigation } from '../../src/features/lab-operations/SampleInvestigation'
import { applyPreparation, getPreparation, type PreparationStepInput } from '../../src/api/lab-preparation'
import { getLabOperationsError } from '../../src/api/lab-operations'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

const params = new URLSearchParams(location.search)
applyThemeMode(params.get('theme') === 'dark' ? 'dark' : 'light')
const session: PhaenoSessionContextValue = { authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null,
  selectedOrganizationId: 'fixture', setSelectedOrganizationId: () => {}, session: { user: { id: 'fixture' }, capabilities: { canOperateLabWork: true, canManageLabOperations: true, canSuperviseLabWork: true } } as SessionResponse }
function Prep({ id }: { id: string }) {
  const query = useQuery({ queryKey: ['phase3-prep', id], queryFn: () => getPreparation(id) })
  const save = useMutation({ mutationFn: (step: PreparationStepInput) => applyPreparation(id, { requestId: crypto.randomUUID(), version: query.data!.version, action: 'step', step }) })
  if (!query.data) return <p>Loading preparation…</p>
  if (save.isSuccess) return <h1>Step recorded</h1>
  const stage = query.data.stages[0]
  return <PreparationStepDialog batch={query.data} stage={stage} step={stage.definition.steps[0]} action="record" onClose={() => {}} pending={save.isPending} error={save.error ? getLabOperationsError(save.error, 'Step capture failed.') : undefined} onSubmit={step => save.mutate(step)} />
}
function Boxes({ barcode }: { barcode: string }) {
  const [open, setOpen] = useState(true)
  return <main className="page-wrap p-4"><h1>Test freezer box</h1>{open ? <StorageBoxDialog barcode={barcode} onClose={() => setOpen(false)} onConfirmed={() => setOpen(false)} /> : <p>Box confirmed</p>}</main>
}
function Fixture() {
  const p = new URLSearchParams(location.search)
  if (p.get('mode') === 'box') return <Boxes barcode={p.get('box')!} />
  if (p.get('mode') === 'queue') return <main className="page-wrap p-4"><h1>Test retention queue</h1><PhysicalRetentionQueue enabled /></main>
  if (p.get('mode') === 'prep') return <Prep id={p.get('prep')!} />
  if (p.get('mode') === 'mix') return <MasterMixPage mixId={p.get('mix')!} />
  if (p.get('mode') === 'history') return <main className="page-wrap p-4"><h1>Test sample history</h1><SampleInvestigation workOrderId={p.get('work')!} specimenId={p.get('specimen')!} /></main>
  return <LabTubePage workOrderId={p.get('work')!} containerId={p.get('tube')!} />
}
const root = createRootRoute({ component: () => <PhaenoSessionContext.Provider value={session}><Outlet /><PortalConfirmation /></PhaenoSessionContext.Provider> })
const home = createRoute({ getParentRoute: () => root, path: '/e2e/fixtures/sample-lifecycle-phase3.html', component: Fixture })
const router = createRouter({ routeTree: root.addChildren([home]) })
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
