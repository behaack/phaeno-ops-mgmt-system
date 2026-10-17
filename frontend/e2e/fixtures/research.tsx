// Synthetic acceptance; opt-in local illustration mode uses in-memory demonstration records.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider, Outlet, useParams } from '@tanstack/react-router'
import { configureApiAuth } from '../../src/api/client'
import { PhaenoSessionContext } from '../../src/features/auth/session-context'
import type { SessionResponse } from '../../src/api/session'
import { ResearchShell } from '../../src/features/research/ResearchShell'
import { ResearchProjectsPage, ResearchExperimentsPage } from '../../src/features/research/ResearchLists'
import { ResearchProjectPage } from '../../src/features/research/ResearchProjectPage'
import { ResearchExperimentPage } from '../../src/features/research/ResearchExperimentPage'
import { ResearchEntryEditor } from '../../src/features/research/ResearchEntryEditor'
import { ResearchEntryPage } from '../../src/features/research/ResearchEntryPage'
import { parseResearchSearch } from '../../src/features/research/research-search'
import { PortalConfirmation } from '../../src/components/PortalConfirmation'
import { DocumentationLayout, DocumentationPage } from '../../src/features/documentation/DocumentationPage'
import { installResearchGuideData } from './research-guide-data'
import '../../src/styles.css'

const settings = new URLSearchParams(location.search)
if (settings.get('illustrate') === 'true') installResearchGuideData()
const org = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
configureApiAuth({ getSelectedOrganizationId: () => org })
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
const root = createRootRoute({ component: () => <><Outlet /><PortalConfirmation /></> })
const workspace = createRoute({ getParentRoute: () => root, path: '/research', validateSearch: parseResearchSearch, component: ResearchShell })
const projects = createRoute({ getParentRoute: () => workspace, path: '/', component: ResearchProjectsPage })
const experiments = createRoute({ getParentRoute: () => workspace, path: '/experiments', component: ResearchExperimentsPage })
const project = createRoute({ getParentRoute: () => workspace, path: '/projects/$projectId', component: FixtureProject })
const experiment = createRoute({ getParentRoute: () => workspace, path: '/experiments/$experimentId', component: FixtureExperiment })
const editor = createRoute({ getParentRoute: () => workspace, path: '/experiments/$experimentId/entries/$entryId/edit', component: FixtureEditor })
const entry = createRoute({ getParentRoute: () => workspace, path: '/experiments/$experimentId/entries/$entryId', component: FixtureEntry })
function FixtureProject() { const params = useParams({ strict: false }); return <ResearchProjectPage projectId={params.projectId ?? ''} /> }
function FixtureExperiment() { const params = useParams({ strict: false }); return <ResearchExperimentPage experimentId={params.experimentId ?? ''} /> }
function FixtureEditor() { const params = useParams({ strict: false }); return <ResearchEntryEditor experimentId={params.experimentId ?? ''} entryId={params.entryId ?? ''} /> }
function FixtureEntry() { const params = useParams({ strict: false }); return <ResearchEntryPage experimentId={params.experimentId ?? ''} entryId={params.entryId ?? ''} /> }
const docs = createRoute({ getParentRoute: () => root, path: '/docs/phaeno/$slug', component: FixtureDocs })
function FixtureDocs() { const params = useParams({ strict: false }); return <DocumentationLayout><DocumentationPage audience="phaeno" slug={params.slug} /></DocumentationLayout> }
const start = settings.get('view') === 'howto' ? '/docs/phaeno/how-to-record-research' : settings.get('illustrate') === 'true' ? '/research' : settings.get('view') === 'editor' ? '/research/experiments/22222222-2222-2222-2222-222222222222/entries/33333333-3333-4333-8333-333333333333/edit' : '/research/experiments/22222222-2222-2222-2222-222222222222'
const router = createRouter({ routeTree: root.addChildren([docs, workspace.addChildren([projects, experiments, project, experiment, editor, entry])]), history: createMemoryHistory({ initialEntries: [start] }) })
const session = { state: 'ready', user: { id: 'fixture-author', firstName: 'Fixture', lastName: 'Researcher', email: 'fixture@example.invalid', status: 'Active' },
  memberships: [{ organizationId: org, organizationKind: settings.get('external') === 'true' ? 'Customer' : 'Phaeno' }], selectedOrganization: { organizationId: org },
  isPlatformAdmin: false, capabilities: { canAccessResearch: settings.get('denied') !== 'true' } } as SessionResponse
if (settings.get('dark') === 'true') document.documentElement.classList.add('dark')
createRoot(document.getElementById('root')!).render(<PhaenoSessionContext.Provider value={{ session, selectedOrganizationId: org, setSelectedOrganizationId: () => {}, authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null }}><QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider></PhaenoSessionContext.Provider>)
