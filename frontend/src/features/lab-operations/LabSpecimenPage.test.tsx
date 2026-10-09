import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '#/api/lab-operations'
import { LabSpecimenPage } from './LabSpecimenPage'

const routeSearch = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn(), useBlocker: vi.fn(), useSearch: () => routeSearch.value, Link: ({ children, to, search }: { children: ReactNode; to: string; search?: Record<string, unknown> | ((previous: Record<string, unknown>) => Record<string, unknown>) }) => {
  const next = typeof search === 'function' ? search(routeSearch.value) : search ?? {}
  return <a href={`${to}?${new URLSearchParams(Object.entries(next).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])).toString()}`}>{children}</a>
} }))
vi.mock('./SpecimenOverview', () => ({ SpecimenOverview: () => <p>Specimen trace overview</p> }))
vi.mock('./SampleInvestigation', () => ({ SampleInvestigation: ({ view }: { view: string }) => <p>{view} evidence</p> }))
vi.mock('#/features/orders/use-specimen-holds', () => ({ useSpecimenHolds: () => ({ query: { data: { specimens: [], holds: [] }, isError: false } }) }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ session: { capabilities: { canManageLabOperations: true } }, authProvider: 'clerk' }) }))
vi.mock('#/api/lab-operations', async original => ({ ...await original<typeof api>(), getLabAttempts: vi.fn(), getLabWorkOrder: vi.fn(), applyLabAttemptCommand: vi.fn() }))

describe('Specimen attempt draft recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeSearch.value = {}
    vi.mocked(useBlocker).mockReturnValue({ status: 'idle', proceed: vi.fn(), reset: vi.fn() } as unknown as ReturnType<typeof useBlocker>)
    vi.mocked(api.getLabAttempts).mockResolvedValue({ workOrderId: 'work', jobName: 'Test Job', workOrderVersion: 1, policyKey: null, canOperate: true, canAdoptPolicy: true, stages: [], specimens: [{ id: 'specimen', name: 'Test specimen', intakeDisposition: 'Accepted', processingState: 'Not started', tubes: [], attempts: [], receivedTubes: 0, expectedTubes: 0, eligibleTubes: 0 }] } as unknown as api.LabAttemptWorkspace)
    vi.mocked(api.getLabWorkOrder).mockResolvedValue({ executions: [], exceptions: [], libraries: [], specimens: [] } as unknown as Awaited<ReturnType<typeof api.getLabWorkOrder>>)
  })

  it('opens in Overview and preserves direct specimen discovery filters on return', async () => {
    routeSearch.value = { section: 'specimens', specimenSearch: 'RNA', specimenPage: 3, specimenScope: 'Historical', specimenBlocked: true }
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LabSpecimenPage workOrderId="work" specimenId="specimen" /></QueryClientProvider>)
    const link = await screen.findByRole('link', { name: 'Back to specimens' })
    expect(link.getAttribute('href')).toContain('specimenPage=3')
    expect(link.getAttribute('href')).toContain('specimenScope=Historical')
    expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByText('Tubes')).toBeNull()
    expect(screen.getByText('Specimen trace overview')).toBeTruthy()
  })

  it('returns to the accession directory with its search, status and page', async () => {
    routeSearch.value = { section: 'receipt', accessionView: 'samples', accessionSearch: 'FB-1', accessionStatus: 'Accepted', accessionUse: 'Used', accessionPage: 2 }
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LabSpecimenPage workOrderId="work" specimenId="specimen" /></QueryClientProvider>)
    const link = await screen.findByRole('link', { name: 'Back to accessioned samples' })
    expect(link.getAttribute('href')).toContain('accessionPage=2')
    expect(link.getAttribute('href')).toContain('accessionSearch=FB-1')
    expect(link.getAttribute('href')).toContain('accessionStatus=Accepted')
    expect(link.getAttribute('href')).toContain('accessionUse=Used')
  })

  it('retains entered evidence when discard is declined and protects navigation until discard is accepted', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><LabSpecimenPage workOrderId="work" specimenId="specimen" /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm tube-use instruction' }))
    const input = screen.getByLabelText(/Reason and evidence/)
    fireEvent.change(input, { target: { value: 'Retain this reviewed instruction' } })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(await screen.findByRole('dialog', { name: 'Discard unsaved attempt details?' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keep reviewing' }))
    expect(screen.getByLabelText(/Reason and evidence/)).toHaveProperty('value', 'Retain this reviewed instruction')
    const guard = vi.mocked(useBlocker).mock.calls.at(-1)![0] as unknown as { enableBeforeUnload: () => boolean; shouldBlockFn: () => boolean }
    expect(guard.enableBeforeUnload()).toBe(true)
    expect(guard.shouldBlockFn()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(api.applyLabAttemptCommand).not.toHaveBeenCalled()
  })

  it('keeps the active attempt on its recorded workflow when a newer default exists', async () => {
    vi.mocked(api.getLabAttempts).mockResolvedValue({
      workOrderId: 'work', jobName: 'Test Job', workOrderVersion: 1, policyKey: 'run_one_with_failure_fallback',
      workflowName: 'Service procedure', workflowVersion: 2, defaultWorkflowVersionId: 'workflow-v2', canOperate: true, canAdoptPolicy: false,
      stages: [
        { id: 'new-first', name: 'New preparation', sequence: 1, requirement: 'Required', protocolVersionId: 'new-protocol', workflowVersionId: 'workflow-v2' },
        { id: 'original-first', name: 'Original preparation', sequence: 1, requirement: 'Required', protocolVersionId: 'original-protocol', workflowVersionId: 'workflow-v1' },
      ],
      specimens: [{ id: 'specimen', name: 'Test specimen', accessionNumber: 'ACC-TEST', intakeDisposition: 'Accepted', processingState: 'Planned',
        reasonCode: null, note: null, nextAction: null, receivedTubes: 1, expectedTubes: 1, eligibleTubes: 0, tubes: [], blocker: null,
        attempts: [{ id: 'attempt', specimenId: 'specimen', sequence: 1, previousAttemptId: null, sourceContainerId: 'tube', sourceBarcode: 'TUBE-1', state: 'Planned', version: 1,
          workflowVersionId: 'workflow-v1', workflowName: 'Service procedure', workflowVersion: 1, startedAtUtc: null, closedAtUtc: null,
          failureReasonCode: null, failureEvidence: null, failedExecutionId: null, holdReason: null, nextAction: null, ownerUserId: null, stageSkips: [], executionIds: [] }],
      }],
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><LabSpecimenPage workOrderId="work" specimenId="specimen" selectedTab="processing" /></QueryClientProvider>)
    expect(await screen.findByText('Attempt workflow: Service procedure · version 1')).toBeTruthy()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions' }), { button: 0, ctrlKey: false })
    expect(await screen.findByRole('menuitem', { name: 'Assign Original preparation' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Assign New preparation' })).toBeNull()
  })

})
