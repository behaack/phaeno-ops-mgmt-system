import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { getLabScientificReviewQueue, type LabScientificReviewQueueItem } from '#/api/lab-operations'
import { ResultsWorkQueue } from './ResultsWorkQueue'

vi.mock('#/api/lab-operations', async original => ({ ...await original<typeof import('#/api/lab-operations')>(), getLabScientificReviewQueue: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="#review">{children}</a> }))
const clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; vi.clearAllMocks() })
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  render(<QueryClientProvider client={client}><ResultsWorkQueue enabled /></QueryClientProvider>)
}

it('shows pending package counts without implying that every specimen is ready', async () => {
  vi.mocked(getLabScientificReviewQueue).mockResolvedValue([{ pendingPackageCount: 1,
    workOrder: { id: 'job', displayName: 'ASSEMBLED-JOB', status: 'DataProcessing', specimenCount: 2, openExceptionCount: 0 },
  } as LabScientificReviewQueueItem])
  show()
  expect(await screen.findByRole('link', { name: 'ASSEMBLED-JOB' })).toBeTruthy()
  expect(screen.getByText('1 package awaiting review · 2 specimens · 0 open exceptions')).toBeTruthy()
  expect(screen.getByText('Awaiting scientific review')).toBeTruthy()
  expect(screen.queryByText('Data Processing')).toBeNull()
})

it('explains an empty queue without showing sequencing-only jobs', async () => {
  vi.mocked(getLabScientificReviewQueue).mockResolvedValue([])
  show()
  expect(await screen.findByText(/No completed assembly outputs are awaiting scientific review/)).toBeTruthy()
  expect(screen.queryByRole('link')).toBeNull()
})

it('distinguishes a failed read from an empty queue and provides recovery', async () => {
  vi.mocked(getLabScientificReviewQueue).mockRejectedValue(new Error('Unavailable'))
  show()
  expect(await screen.findByText('Scientific review queue could not be loaded')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Refresh queue' })).toBeTruthy()
  expect(screen.queryByText(/No completed assembly outputs are awaiting scientific review/)).toBeNull()
})
