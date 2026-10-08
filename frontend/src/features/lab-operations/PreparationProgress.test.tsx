import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PreparationDetail } from '#/api/lab-preparation'
import { PreparationProgress } from './PreparationProgress'

const batch: PreparationDetail = { id: 'batch', name: 'Batch', status: 'Draft', version: 1, trayBarcode: 'TRAY', startedAtUtc: null, completedAtUtc: null, layout: { name: 'Tray', rows: 1, columns: 2, labels: 'grid', unavailable: [] }, labServiceWorkflowVersionId: 'workflow', members: [{ id: 'member', position: 'A1', barcode: 'TUBE', attemptId: 'attempt', sequence: 1, workOrderId: 'job', jobName: 'JOB', specimenId: 'specimen', specimenName: 'Sample', state: 'Planned', failureEvidence: null, blocker: null, stageSkips: [], executions: [], output: null, library: null }], stages: [], records: [], canOperate: true, canCorrect: false, roles: ['Operator'] }

describe('preparation step information', () => {
  it('shows workflow step and protocol totals instead of tube outcome totals for preparation', async () => {
    render(<PreparationProgress batch={{ ...batch, status: 'InProgress', stages: [{ id: 'stage', name: 'Protocol', sequence: 1, requirement: 'Required', definition: { schemaVersion: 1, steps: [{ key: 'identity', name: 'Identity', instructions: 'Verify', required: true, repeatable: false, operatorConfirmation: true, captures: [], inputMaterials: [], preparedOutputs: [], equipmentTypes: [] }] } }] }} title="Prepare libraries" description="Record steps." />)
    fireEvent.click(screen.getByRole('button', { name: /step 2: Prepare libraries/ }))
    const panel = await screen.findByRole('dialog', { name: 'Prepare libraries' })
    expect(within(panel).getByText('0 of 1 steps completed.')).toBeTruthy()
    expect(within(panel).getByText('0 of 1 protocols completed.')).toBeTruthy()
    expect(within(panel).queryByText(/tubes have resolved outcomes/)).toBeNull()
  })

  it('keeps a partially loaded tray current until saved confirmation', () => {
    const { rerender } = render(<PreparationProgress batch={batch} title="Review and confirm the tray" description="Confirm when ready." />)
    const strip = screen.getByRole('list', { name: 'Preparation steps' })
    expect(within(strip).getAllByRole('listitem')).toHaveLength(4)
    expect(within(strip).queryByText('Assemble tray')).toBeNull()
    const prepare = screen.getByRole('button', { name: /step 1: Prepare tray. Current step/ })
    expect(prepare.closest('li')?.getAttribute('aria-current')).toBe('step')
    rerender(<PreparationProgress batch={{ ...batch, trayConfirmed: true }} title="Start preparation" description="Start when ready." />)
    expect(screen.getByRole('button', { name: /step 1: Prepare tray. Complete/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /step 2: Prepare libraries. Current step/ }).closest('li')?.getAttribute('aria-current')).toBe('step')
  })

  it('opens on keyboard focus without moving focus, dismisses with Escape and opens by tap/click', async () => {
    render(<PreparationProgress batch={batch} title="Review and confirm the tray" description="Confirm when ready." />)
    const prepare = screen.getByRole('button', { name: /step 1: Prepare tray/ })
    act(() => prepare.focus())
    const panel = await screen.findByRole('dialog', { name: 'Prepare tray' })
    expect(document.activeElement).toBe(prepare)
    expect(within(panel).getByText(/Partial trays are allowed/)).toBeTruthy()
    expect(within(panel).getByText('1 tube loaded · Awaiting confirmation')).toBeTruthy()
    fireEvent.keyDown(prepare, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /step 4: Sequencing handoff/ }))
    expect(await screen.findByRole('dialog', { name: 'Sequencing handoff' })).toBeTruthy()
    expect(screen.getByText(/Available after preparation is complete/)).toBeTruthy()
    expect(screen.getByText('Confirm when ready.')).toBeTruthy()
  })
})
