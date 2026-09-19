// Synthetic browser fixture; production routes never import it.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { SampleInvestigation } from '../../src/features/lab-operations/SampleInvestigation'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

applyThemeMode(new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : 'light')

const root = createRootRoute({ component: () => <main className="mx-auto max-w-5xl p-4"><h1 className="mb-4 text-2xl">Test sample</h1><SampleInvestigation workOrderId="test-job" specimenId="test-sample" /></main> })
const router = createRouter({ routeTree: root })
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
