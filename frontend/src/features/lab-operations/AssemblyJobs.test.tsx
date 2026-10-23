import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import type { AssemblyJob } from '#/api/lab-assembly'
import { AssemblyJobPage, AssemblyJobProgress, AssemblyJobsList, DataAssemblyWorkspace } from './AssemblyJobs'

const mockApi = vi.hoisted(() => ({ list: vi.fn(), inputs: vi.fn(), allowed: false }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'mock', session: { capabilities: { canManageLabOperations: mockApi.allowed, canOperateLabWork: mockApi.allowed } }, selectedOrganizationId: null }) }))
vi.mock('#/api/lab-assembly', async original => ({ ...await original<object>(), getAssemblyJobs: mockApi.list, getAssemblyJobsPage: mockApi.list, getAssemblyInputs: mockApi.inputs }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: () => ({status: 'idle', reset: vi.fn(), proceed: vi.fn()}), Link: ({ children, className, ...props }: { children: ReactNode; className?: string; 'data-slot'?: string }) => <a href="#job" className={className} data-slot={props['data-slot']}>{children}</a>, useNavigate: () => vi.fn(), useSearch: () => ({}), useRouterState: ({ select }: { select: (state: { location: { search: object } }) => unknown }) => select({ location: { search: {} } }) }))
afterEach(() => { cleanup(); mockApi.allowed = false })
const job = { id: 'test-job', sampleName: 'Sample A', sequencingRunNumber: 2, state: 'Running', isTerminal: false,
  cancellationRequested: false, progress: { percentage: 42, receivedAtUtc: new Date().toISOString(), sequence: 1 } } as AssemblyJob

it.each([{available:false,active:false},{available:true,active:true}])('aligns actual input/job rows and retains the Start guard %j',async({available,active})=>{
  mockApi.allowed=true
  mockApi.inputs.mockResolvedValue([{labWorkOrderId:'work',labSpecimenId:'sample',labSpecimenAttemptId:'attempt',sequencingRunNumber:2,sampleName:'Sample A',providerRunReference:'Run reference'}])
  mockApi.list.mockResolvedValue({jobs:[{...job,labSpecimenId:active?'sample':'other'}],canOperate:true,availability:{available,message:'Processing unavailable.',recipes:[]}})
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}})
  render(<QueryClientProvider client={client}><DataAssemblyWorkspace apiEnabled /><AssemblyJobsList enabled /></QueryClientProvider>)
  await waitFor(()=>expect(screen.getAllByRole('link',{name:'Sample A · Run 2'})).toHaveLength(2))
  const links=screen.getAllByRole('link',{name:'Sample A · Run 2'})
  expect(links[0].className).toBe(links[1].className)
  expect(links.every(link=>link.closest('[data-slot="record-list-item"]'))).toBe(true)
  if (active) expect(screen.getByRole('button',{name:'View assembly'})).toBeTruthy()
  else expect(screen.getByRole('button',{name:'Start assembly'}).hasAttribute('disabled')).toBe(true)
  expect(screen.getAllByText(available?'An assembly is already active for this specimen and run.':'Processing unavailable.',{exact:true}).length).toBeGreaterThan(0)
  client.clear()
})

it('displays live progress and replaces it with the final disposition', () => {
  const view = render(<AssemblyJobProgress job={job} />)
  expect(screen.getByRole('progressbar').getAttribute('value')).toBe('42')
  expect(screen.getByText('42%')).toBeTruthy()
  view.rerender(<AssemblyJobProgress job={{ ...job, state: 'Terminated', isTerminal: true }} />)
  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(screen.queryByText('42%')).toBeNull()
  expect(screen.getByText('Terminated')).toBeTruthy()
})

it('distinguishes simulated completion from a scientific success', () => {
  render(<AssemblyJobProgress job={{ ...job, state: 'Succeeded', isTerminal: true, simulated: true }} />)
  expect(screen.getByText('Simulation completed')).toBeTruthy()
  expect(screen.queryByText('Succeeded')).toBeNull()
  expect(screen.queryByRole('progressbar')).toBeNull()
})

it('uses the assembly tracker without a generic start action and explains missing setup', async () => {
  mockApi.list.mockResolvedValue({ jobs: [], canOperate: true,
    availability: { available: false, message: 'The processing service is not connected.', supportsCancellation: false, recipes: [] } })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><AssemblyJobsList enabled /></QueryClientProvider>)
  expect(await screen.findByText('Assembly setup required')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Start assembly' })).toBeNull()
  expect(screen.getByText('No assembly jobs have been requested.')).toBeTruthy()
  expect(screen.queryByText('Failed')).toBeNull()
  client.clear()
})

it('shows unavailable progress after transient data is lost', () => {
  render(<AssemblyJobProgress job={{ ...job, progress: null }} />)
  expect(screen.getByText('Progress unavailable')).toBeTruthy()
  expect(screen.getByRole('progressbar', { name: 'Assembly progress for Sample A, run 2' }).hasAttribute('value')).toBe(false)
  expect(screen.getByText('Running')).toBeTruthy()
})

it('keeps stale progress indeterminate without inventing a percentage', () => {
  render(<AssemblyJobProgress job={{ ...job, progress: { percentage: 75, receivedAtUtc: new Date(Date.now() - 180_000).toISOString(), sequence: 2 } }} />)
  expect(screen.getByRole('progressbar').hasAttribute('value')).toBe(false)
  expect(screen.queryByText('75%')).toBeNull()
  expect(screen.getByText('Progress unavailable')).toBeTruthy()
})

it('does not replace a running state with success when reported progress reaches 100', () => {
  render(<AssemblyJobProgress job={{ ...job, progress: { percentage: 100, receivedAtUtc: new Date().toISOString(), sequence: 3 } }} />)
  expect(screen.getByRole('progressbar').getAttribute('value')).toBe('100')
  expect(screen.getByText('Running')).toBeTruthy()
  expect(screen.queryByText('Succeeded')).toBeNull()
})

it('shows a confirmed cancellation outcome without claiming an unsent cancellation was received', () => {
  mockApi.allowed = true
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['assembly-job', job.id], { job: { ...job, state: 'Succeeded', isTerminal: true },
    canReconcile: false, reconciliation: { hasUnresolvedConflict: false, eligible: false, receipts: [], additionalEvidence: [], decisions: [] },
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

it('keeps loaded assembly rows stable and quiet during background refresh and a failed refresh', async () => {
  mockApi.list.mockResolvedValueOnce({ jobs: [{ ...job, isTerminal: true, state: 'Failed', attentionReason: 'Review required' }], canOperate: false,
    availability: { available: true, message: '', recipes: [] } })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><AssemblyJobsList enabled /></QueryClientProvider>)
  const original = await screen.findByRole('link', { name: 'Sample A · Run 2' })
  let reject!: (error: Error) => void
  mockApi.list.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
  let refresh!: Promise<void>
  act(() => { refresh = client.refetchQueries({ queryKey: ['assembly-jobs'] }) })
  await waitFor(() => expect(reject).toBeTypeOf('function'))
  expect(original.isConnected).toBe(true)
  expect(screen.queryByText('Refreshing assembly jobs…')).toBeNull()
  await act(async () => { reject(new Error('Temporary refresh failure')); await refresh })
  expect(screen.getByRole('link', { name: 'Sample A · Run 2' })).toBe(original)
  expect(await screen.findByText('Assembly jobs could not be refreshed')).toBeTruthy()
  client.clear()
})
