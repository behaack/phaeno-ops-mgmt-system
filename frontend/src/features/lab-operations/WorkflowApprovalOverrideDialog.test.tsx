import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { LabServiceWorkflow, LabServiceWorkflowVersion } from '#/api/lab-operations'
import { WorkflowApprovalOverrideDialog } from './WorkflowApprovalOverrideDialog'

vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn() }))
const version: LabServiceWorkflowVersion = { id: 'version', workflowVersion: 2, status: 'Draft', authoredByUserId: 'author', authoredAtUtc: '', approvedByUserId: null, approvedAtUtc: null, productionByUserId: null, productionAtUtc: null, version: 1, stages: [{ id: 'stage', sequence: 1, name: 'Preparation', labProtocolVersionId: 'protocol-version', labProtocolId: 'protocol', protocolKey: 'prep', protocolName: 'Library preparation', protocolVersion: 2, requirement: 'Required', condition: null, handoffCriteria: 'QC passed' }] }
const workflow: LabServiceWorkflow = { id: 'workflow', serviceKey: 'test', name: 'TEST ONLY workflow', description: null, latestVersion: 2, versions: [version], version: 1 }

it('requires reason and confirmation, preserves failed entries, and blocks pending dismissal', async () => {
  const approve = vi.fn()
  const close = vi.fn()
  const props = { workflow, version, pending: false, onApprove: approve, onClose: close }
  const view = render(<WorkflowApprovalOverrideDialog {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Approve with override' }))
  expect(await screen.findByText('Enter a reason for bypassing independent review.')).toBeTruthy()
  expect(approve).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(/Override reason/), { target: { value: '  TEST ONLY verified  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Approve with override' }))
  expect(approve).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Approve with override' }))
  await waitFor(() => expect(approve).toHaveBeenCalledWith('TEST ONLY verified'))
  view.rerender(<WorkflowApprovalOverrideDialog {...props} error="Version changed" />)
  expect(screen.getByLabelText(/Override reason/)).toHaveProperty('value', '  TEST ONLY verified  ')
  view.rerender(<WorkflowApprovalOverrideDialog {...props} pending />)
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
  expect(close).not.toHaveBeenCalled()
})
