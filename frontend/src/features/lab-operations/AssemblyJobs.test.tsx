import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import type { AssemblyJob } from '#/api/lab-assembly'
import { AssemblyJobPage, AssemblyJobProgress, AssemblyJobsList } from './AssemblyJobs'

const mockApi = vi.hoisted(() => ({ list: vi.fn(), allowed: false }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'mock', session: { capabilities: { canManageLabOperations: mockApi.allowed } }, selectedOrganizationId: null }) }))
vi.mock('#/api/lab-assembly', async original => ({ ...await original<object>(), getAssemblyJobs: mockApi.list }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="#job">{children}</a>, useNavigate: () => vi.fn(), useSearch: () => ({}) }))
afterEach(() => { cleanup(); mockApi.allowed = false })
const job = { id: 'test-job', sampleName: 'Sample A', sequencingRunNumber: 2, state: 'Running', isTerminal: false,
  cancellationRequested: false, progress: { percentage: 42, receivedAtUtc: new Date().toISOString(), sequence: 1 } } as AssemblyJob

it('displays live progress and replaces it with the final disposition', () => {
  const view = render(<AssemblyJobProgress job={job} />)
  expect(screen.getByRole('progressbar').getAttribute('value')).toBe('42')
  expect(screen.getByText('42%')).toBeTruthy()
  view.rerender(<AssemblyJobProgress job={{ ...job, state: 'Terminated', isTerminal: true }} />)
  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(screen.queryByText('42%')).toBeNull()
  expect(screen.getByText('Terminated')).toBeTruthy()
})

it('keeps start unavailable and explains missing setup without claiming a job failed', async () => {
  mockApi.list.mockResolvedValue({ jobs: [], canOperate: true,
    availability: { available: false, message: 'The processing service is not connected.', supportsCancellation: false, recipes: [] } })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><AssemblyJobsList enabled /></QueryClientProvider>)
  expect(await screen.findByText('Assembly setup required')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Start assembly' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText('No assembly jobs have been requested.')).toBeTruthy()
  expect(screen.queryByText('Failed')).toBeNull()
  client.clear()
})

it('shows unavailable progress after transient data is lost', () => {
  render(<AssemblyJobProgress job={{ ...job, progress: null }} />)
  expect(screen.getByText('Progress unavailable')).toBeTruthy()
  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(screen.getByText('Running')).toBeTruthy()
})

it('shows a confirmed cancellation outcome without claiming an unsent cancellation was received', () => {
  mockApi.allowed = true
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['assembly-job', job.id], { job: { ...job, state: 'Succeeded', isTerminal: true },
    recipe: { name: 'TEST recipe', version: '1' }, inputs: [], events: [], canOperate: false,
    availability: { available: false, message: 'Processing connection is not configured.' },
    delivery: [{ kind: 'Cancel', attemptCount: 0, receivedAtUtc: null, confirmedAtUtc: new Date().toISOString(),
      escalatedAtUtc: null, suppressed: false, lastAttemptAtUtc: null, nextAttemptAtUtc: null }],
  })
  render(<QueryClientProvider client={client}><AssemblyJobPage jobId={job.id} /></QueryClientProvider>)
  expect(screen.getByText('Delivery and recovery')).toBeTruthy()
  expect(screen.getByText('Cancellation request · Outcome confirmed')).toBeTruthy()
  expect(screen.getByText(/0 delivery attempts/)).toBeTruthy()
  expect(screen.queryByText(/Recovery continues until/)).toBeNull()
  client.clear()
})
