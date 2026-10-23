import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AssemblyDetail } from '#/api/lab-assembly'
import { AssemblyReconciliationDialog } from './AssemblyReconciliation'
import { AssemblyJobPage } from './AssemblyJobs'

const mock = vi.hoisted(() => ({ reconcile: vi.fn() }))
vi.mock('#/api/lab-assembly', async original => ({ ...await original<object>(), reconcileAssembly: mock.reconcile }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'mock', session: { capabilities: { canManageLabOperations: true } }, selectedOrganizationId: null }) }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: () => ({ status: 'idle', reset: vi.fn(), proceed: vi.fn() }), Link: ({ children }: { children: ReactNode }) => <a href="#job">{children}</a>, useNavigate: () => vi.fn(), useRouterState: ({ select }: { select: (state: { location: { search: object } }) => unknown }) => select({ location: { search: {} } }) }))

const detail: AssemblyDetail = {
  job: { id: 'attempt', labWorkOrderId: 'work', labSpecimenId: 'sample', sampleName: 'Review sample', sequencingRunNumber: 1,
    state: 'Failed', isTerminal: true, attentionReason: 'Conflicting processing evidence requires Operations reconciliation.',
    requestedAtUtc: '2026-10-21T22:59:17Z', startedAtUtc: '2026-10-21T22:59:18.123740Z', stoppedAtUtc: '2026-10-21T23:00:10.791873Z', dispositionAtUtc: '2026-10-21T23:00:10.791873Z',
    durationSeconds: 52, cancellationRequested: false, dispositionReason: 'First failure', previousJobId: null, retryReason: null,
    labAnalysisRunId: null, outputsDeclared: false, providerKey: 'test', providerJobId: 'provider-attempt', requestedByUserId: 'operator', version: 6, progress: null, simulated: true },
  canOperate: false, canReconcile: true, recipe: { key: 'test', name: 'Test recipe', version: '1', parametersJson: '{}', simulated: true },
  availability: { available: true, message: '', supportsCancellation: true, recipes: [] },
  inputs: [], analyses: [], events: [], delivery: [], simulatedOutputs: [],
  reconciliation: { hasUnresolvedConflict: true, eligible: true, ineligibleReason: null, evidenceFingerprint: 'A'.repeat(64), decisions: [], additionalEvidence: [], receipts: [
    { id: 'original', eventId: 'original-event', sequence: 151, outcome: 'Applied', payloadSha256: 'B'.repeat(64), conflictSha256: null,
      occurredAtUtc: '2026-10-21T23:00:10Z', receivedAtUtc: '2026-10-21T23:00:10Z', state: 'Failed', providerJobId: 'provider-attempt',
      startedAtUtc: '2026-10-21T22:59:18.123740Z', stoppedAtUtc: '2026-10-21T23:00:10.791873Z', dispositionAtUtc: '2026-10-21T23:00:10.791873Z', reason: 'First failure' },
    { id: 'conflict', eventId: 'conflicting-event', sequence: 305, outcome: 'Conflict', payloadSha256: 'C'.repeat(64), conflictSha256: null,
      occurredAtUtc: '2026-10-21T23:01:21Z', receivedAtUtc: '2026-10-21T23:01:21Z', state: 'Failed', providerJobId: 'provider-attempt',
      startedAtUtc: '2026-10-21T22:59:18Z', stoppedAtUtc: '2026-10-21T23:01:21Z', dispositionAtUtc: '2026-10-21T23:01:21Z', reason: 'Second failure' },
  ] },
}
beforeEach(() => mock.reconcile.mockReset())
afterEach(cleanup)

function harness(data = detail) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const close = vi.fn()
  const element = (value: AssemblyDetail) => <QueryClientProvider client={client}><button id="assembly-context-actions">Reconcile for repeat</button><AssemblyReconciliationDialog data={value} onClose={close} /></QueryClientProvider>
  const view = render(element(data))
  return { client, close, view, element }
}
function fillReview() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Decision reason' }), { target: { value: 'Retain the failed outcome.' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Independent verification evidence' }), { target: { value: 'Provider operator verified that execution is stopped and cannot resume.' } })
  fireEvent.click(screen.getByRole('checkbox'))
}

it('shows both retained receipts and requires a reason, independent evidence and no-resumption confirmation', async () => {
  const { client } = harness()
  const dialog = screen.getByRole('dialog')
  expect(dialog.querySelector('[data-slot="dialog-header"]')).toBeTruthy()
  expect(dialog.querySelector('[data-slot="dialog-body"]')?.textContent).toContain('original execution times')
  expect(dialog.querySelector('[data-slot="dialog-footer"]')).toBeTruthy()
  expect(screen.getByText('original-event')).toBeTruthy()
  expect(screen.getByText('conflicting-event')).toBeTruthy()
  expect(screen.getByText(/22:59:18.123740Z/)).toBeTruthy()
  expect(dialog.querySelector('[data-slot="required-legend"]')?.textContent).toMatch(/Required/)
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })))
  fireEvent.click(screen.getByRole('button', { name: 'Record reconciliation' }))
  await waitFor(() => expect(screen.getByText('Explain why the saved outcome is being retained.')).toBeTruthy())
  expect(mock.reconcile).not.toHaveBeenCalled()
  client.clear()
})

it('retains entered evidence after rejection and blocks duplicate submission and dismissal while saving', async () => {
  const { client, close } = harness()
  mock.reconcile.mockRejectedValueOnce(new Error('Review rejected'))
  fillReview()
  fireEvent.click(screen.getByRole('button', { name: 'Record reconciliation' }))
  await screen.findByRole('alert')
  expect(screen.getByRole('textbox', { name: 'Decision reason' })).toHaveProperty('value', 'Retain the failed outcome.')
  let finish!: (value: AssemblyDetail['job']) => void
  mock.reconcile.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  fireEvent.click(screen.getByRole('button', { name: 'Record reconciliation' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Recording…' })).toHaveProperty('disabled', true))
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
  await act(async () => { finish(detail.job) })
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
  expect(mock.reconcile).toHaveBeenCalledTimes(2)
  client.clear()
})

it('requires explicit review of refreshed evidence while retaining text and resetting the stopped confirmation', async () => {
  const { client, view, element } = harness()
  fillReview()
  const changed = { ...detail, reconciliation: { ...detail.reconciliation, evidenceFingerprint: 'D'.repeat(64) } }
  view.rerender(element(changed))
  expect(screen.getByRole('button', { name: 'Record reconciliation' })).toHaveProperty('disabled', true)
  fireEvent.click(screen.getByRole('button', { name: 'I have reviewed the updated evidence' }))
  expect(screen.getByRole('checkbox')).toHaveProperty('checked', false)
  expect(screen.getByRole('textbox', { name: 'Decision reason' })).toHaveProperty('value', 'Retain the failed outcome.')
  fireEvent.click(screen.getByRole('checkbox'))
  mock.reconcile.mockResolvedValue(detail.job)
  fireEvent.click(screen.getByRole('button', { name: 'Record reconciliation' }))
  await waitFor(() => expect(mock.reconcile).toHaveBeenCalledOnce())
  expect(mock.reconcile.mock.calls[0][1]).toMatchObject({ version: 6, evidenceFingerprint: 'D'.repeat(64), confirmedStopped: true })
  client.clear()
})

it('uses server-derived reconciliation permission independently from ordinary operator access', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['assembly-job', 'attempt'], { ...detail, canReconcile: false })
  const view = render(<QueryClientProvider client={client}><AssemblyJobPage jobId="attempt" /></QueryClientProvider>)
  expect(screen.queryByRole('button', { name: 'Reconcile for repeat' })).toBeNull()
  expect(screen.getByText(/A Laboratory Supervisor or Operations Administrator/)).toBeTruthy()
  act(() => { client.setQueryData(['assembly-job', 'attempt'], detail) })
  view.rerender(<QueryClientProvider client={client}><AssemblyJobPage jobId="attempt" /></QueryClientProvider>)
  expect(screen.getByRole('button', { name: 'Reconcile for repeat' })).toBeTruthy()
  client.clear()
})
