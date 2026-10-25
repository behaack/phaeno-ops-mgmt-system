// Isolated acceptance fixture. Production routes never import this module.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { useState } from 'react'
import { SampleInvestigation } from '../../src/features/lab-operations/SampleInvestigation'
import { ScientificFileDownload } from '../../src/features/lab-operations/ScientificFileDownload'
import { applyThemeMode } from '../../src/components/theme-mode'
import { Button } from '../../src/components/ui/button'
import { PageTitle } from '../../src/components/ui/page-header'
import '../../src/styles.css'

applyThemeMode(new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : 'light')
function Fixture() {
  const params = new URLSearchParams(window.location.search)
  const work = params.get('work') ?? '', specimen = params.get('specimen') ?? ''
  const [view, setView] = useState<'history' | 'processing' | 'results'>('history')
  return <main className="mx-auto max-w-5xl space-y-4 p-4">
    <PageTitle>Recovered sample investigation</PageTitle>
    <nav className="flex flex-wrap gap-2" aria-label="Investigation views">
      <Button variant="outline" onClick={() => setView('history')}>History view</Button>
      <Button variant="outline" onClick={() => setView('processing')}>Processing view</Button>
      <Button variant="outline" onClick={() => setView('results')}>Results view</Button>
    </nav>
    <SampleInvestigation workOrderId={work} specimenId={specimen} view={view} />
    <section aria-label="Managed scientific file" className="space-y-2">
      <h2>Managed scientific file</h2>
      <ScientificFileDownload work={work} specimen={specimen} reference={`poms-file:${params.get('file') ?? ''}`} />
    </section>
  </main>
}
const route = createRootRoute({ component: Fixture })
const router = createRouter({ routeTree: route })
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
