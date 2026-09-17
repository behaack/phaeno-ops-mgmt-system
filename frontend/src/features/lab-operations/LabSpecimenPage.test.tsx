import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '#/api/lab-operations'
import { LabSpecimenPage } from './LabSpecimenPage'

vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), Link: ({ children }: { children: ReactNode }) => <span>{children}</span> }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ session: { capabilities: { canManageLabOperations: true } }, authProvider: 'clerk' }) }))
vi.mock('#/api/lab-operations', async original => ({ ...await original<typeof api>(), getLabAttempts: vi.fn(), getLabWorkOrder: vi.fn(), applyLabAttemptCommand: vi.fn() }))

describe('Specimen attempt draft recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getLabAttempts).mockResolvedValue({ workOrderId: 'work', jobName: 'Test Job', workOrderVersion: 1, policyKey: null, canOperate: true, canAdoptPolicy: true, stages: [], specimens: [{ id: 'specimen', name: 'Test specimen', intakeDisposition: 'Accepted', processingState: 'Not started', tubes: [], attempts: [], receivedTubes: 0, expectedTubes: 0, eligibleTubes: 0 }] } as unknown as api.LabAttemptWorkspace)
    vi.mocked(api.getLabWorkOrder).mockResolvedValue({ executions: [] } as unknown as Awaited<ReturnType<typeof api.getLabWorkOrder>>)
  })

  it('retains entered evidence when discard is declined and protects navigation until discard is accepted', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><LabSpecimenPage workOrderId="work" specimenId="specimen" /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm tube-use instruction' }))
    const input = screen.getByLabelText(/Reason and evidence/)
    fireEvent.change(input, { target: { value: 'Retain this reviewed instruction' } })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(confirm).toHaveBeenCalledWith('Discard the unsaved attempt details?'))
    expect(screen.getByLabelText(/Reason and evidence/)).toHaveProperty('value', 'Retain this reviewed instruction')
    const guard = vi.mocked(useBlocker).mock.calls.at(-1)![0] as unknown as { enableBeforeUnload: () => boolean; shouldBlockFn: () => boolean }
    expect(guard.enableBeforeUnload()).toBe(true)
    expect(guard.shouldBlockFn()).toBe(true)
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(api.applyLabAttemptCommand).not.toHaveBeenCalled()
    confirm.mockRestore()
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
    render(<QueryClientProvider client={client}><LabSpecimenPage workOrderId="work" specimenId="specimen" /></QueryClientProvider>)
    expect(await screen.findByText('Attempt workflow: Service procedure · version 1')).toBeTruthy()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions' }), { button: 0, ctrlKey: false })
    expect(await screen.findByRole('menuitem', { name: 'Assign Original preparation' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Assign New preparation' })).toBeNull()
  })

})
