// Synthetic browser fixture; production routes never import it.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { SampleInvestigation } from '../../src/features/lab-operations/SampleInvestigation'
import { applyThemeMode } from '../../src/components/theme-mode'
import { useState } from 'react'
import '../../src/styles.css'

applyThemeMode(new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : 'light')

function Fixture() {
  const [view, setView] = useState<'history' | 'results'>('history')
  return <main className="mx-auto max-w-5xl p-4"><h1 className="mb-4 text-2xl">Test sample</h1><button onClick={() => setView('results')}>Results view</button><button onClick={() => setView('history')}>History view</button><SampleInvestigation workOrderId="test-job" specimenId="test-sample" view={view} /></main>
}
const root = createRootRoute({ component: Fixture })
const router = createRouter({ routeTree: root })
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
