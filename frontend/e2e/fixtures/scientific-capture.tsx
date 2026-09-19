// Synthetic browser fixture; production routes never import it.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { ScientificEvidenceList, ScientificEvidencePage } from '../../src/features/lab-operations/ScientificEvidencePage'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'
applyThemeMode(new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light')
const root = createRootRoute({ component: Outlet })
const list = () => <main className="mx-auto max-w-5xl space-y-4 p-4"><h1>Scientific evidence for test sample</h1><ScientificEvidenceList workOrderId="test-job" specimenId="test-sample" /></main>
const home = createRoute({ getParentRoute: () => root, path: '/e2e/fixtures/scientific-capture.html', component: list })
const sample = createRoute({ getParentRoute: () => root, path: '/lab-operations/$workOrderId/specimens/$specimenId', component: list })
const record = createRoute({ getParentRoute: () => root, path: '/lab-operations/$workOrderId/specimens/$specimenId/evidence/$kind/$recordId', validateSearch: (s: Record<string, unknown>): { from?: string } => ({ from: typeof s.from === 'string' ? s.from : undefined }), component: () => <ScientificEvidencePage {...record.useParams()} {...record.useSearch()} /> })
const router = createRouter({ routeTree: root.addChildren([home, sample, record]) })
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
