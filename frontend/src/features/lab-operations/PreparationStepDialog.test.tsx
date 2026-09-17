import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { PreparationDetail, PreparationStage, PreparationStepInput } from '#/api/lab-preparation'
import { PreparationStepDialog } from './PreparationStepDialog'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, params, target }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; params: { specimenId: string } }) =>
    <a href={`/specimens/${params.specimenId}`} target={target}>{children}</a>,
}))

const step: PreparationStage['definition']['steps'][number] = {
  key: 'identity', name: 'Verify identity', instructions: 'Compare the scanned tube with the specimen.',
  required: true, repeatable: true, operatorConfirmation: true,
  inputMaterials: [], equipmentTypes: [], preparedOutputs: [],
  captures: [
    { key: 'specimen-reference', label: 'Specimen reference', type: 'text', required: true, scope: 'shared' },
    { key: 'source', label: 'Source container barcode', type: 'barcode', sourceTube: true, required: true, scope: 'tube' },
    { key: 'identity-checked-on', label: 'Identity checked on', type: 'date', required: true, scope: 'shared' },
  ],
}
const stage: PreparationStage = { id: 'stage', name: 'Readiness', sequence: 1, requirement: 'Required', definition: { schemaVersion: 1, preparationBatchEnabled: true, steps: [step] } }
const batch: PreparationDetail = {
  id: 'batch', name: 'TEST ONLY', status: 'InProgress', version: 1,
  startedAtUtc: '2026-09-17T12:00:00Z', completedAtUtc: null,
  labServiceWorkflowVersionId: 'workflow', stages: [stage], records: [],
  layout: { name: 'Test tray', rows: 1, columns: 2, labels: 'grid', unavailable: [] },
  canOperate: true, canCorrect: true, roles: ['Operator'],
  automaticSpecimenReferences: true,
  members: ['A', 'B'].map((letter, i) => ({
    id: letter, position: `A${i + 1}`, barcode: `TUBE-${letter}`, jobName: 'JOB', workOrderId: 'job',
    specimenId: `specimen-${letter}`, specimenName: `ACC-${letter}`, customerSampleId: `CUSTOMER-${letter}`,
    biologicalSource: i === 0 ? 'Human liver' : 'Human kidney', state: 'InProgress', blocker: null,
    attemptId: letter, sequence: 1, failureEvidence: null, stageSkips: [], output: null, library: null,
    executions: [{ id: letter, stageId: stage.id, status: 'InProgress', blockers: [], evidence: { records: [] } }],
  })),
}

describe('review rationale condition assessment', () => {
  const review: typeof step = { ...step, required: false, condition: 'Review a prior QC hold.', captures: [{ key: 'review-rationale', label: 'Review rationale', type: 'text', required: true, scope: 'shared' }] }
  const props = { batch, stage, step: review, action: 'record' as const, onClose: vi.fn(), onResource: vi.fn(), pending: false }

  it('records one rationale as both capture and condition assessment', async () => {
    const onSubmit = vi.fn()
    render(<PreparationStepDialog {...props} onSubmit={onSubmit} />)
    expect(screen.queryByLabelText(/Reason or condition assessment/)).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: /I performed this step/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm this entry/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save step evidence' }))
    await screen.findByText('Review rationale is required.')
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox', { name: /Review rationale/ }), { target: { value: 'Reviewed the retained hold and successful repeat.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save step evidence' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ sharedCaptures: { 'review-rationale': 'Reviewed the retained hold and successful repeat.' }, reason: 'Reviewed the retained hold and successful repeat.' })
  })

  it('requires an explicit skip reason instead of reusing a hidden rationale', async () => {
    const onSubmit = vi.fn()
    render(<PreparationStepDialog {...props} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByRole('textbox', { name: /Review rationale/ }), { target: { value: 'Unsubmitted review draft' } })
    fireEvent.change(screen.getByLabelText(/Decision/), { target: { value: 'skipped' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm this entry/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save step evidence' }))
    await screen.findByText('Reason is required.')
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Reason or condition assessment/), { target: { value: 'No prior hold to review.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save step evidence' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ outcome: 'skipped', sharedCaptures: {}, reason: 'No prior hold to review.' })
  })

  it.each(['repeat', 'correct'] as const)('retains the separate required reason for %s', action => {
    render(<PreparationStepDialog {...props} action={action} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/Reason or condition assessment/).getAttribute('aria-required')).toBe('true')
  })
})

describe('optional QC report', () => {
  const qcStep: typeof step = { ...step, key: 'qc', name: 'QC', captures: [{ key: 'synthetic-qc-record-reference', label: 'Synthetic QC record reference', type: 'fileReference', required: true, scope: 'shared' }], qcGate: { scope: 'batch', criteria: 'TEST ONLY', outcomes: ['pass', 'fail', 'hold'] } }
  const props = { batch: { ...batch, optionalQcReports: true }, stage, step: qcStep, action: 'record' as const, onClose: vi.fn(), onResource: vi.fn(), pending: false }
  const complete = () => {
    fireEvent.change(screen.getByLabelText(/QC outcome/), { target: { value: 'pass' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I performed this step/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm this entry/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save step evidence' }))
  }
  it('permits omission without inventing a reference or waiving QC', async () => {
    const onSubmit = vi.fn()
    render(<PreparationStepDialog {...props} onSubmit={onSubmit} />)
    expect(screen.queryByLabelText(/Synthetic QC record reference/)).toBeNull()
    expect(screen.getByLabelText('QC report (optional)')).toHaveProperty('type', 'file')
    fireEvent.click(screen.getByRole('button', { name: 'Save step evidence' }))
    await screen.findByText('QC outcome is required.')
    expect(onSubmit).not.toHaveBeenCalled()
    complete()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0].sharedCaptures).toEqual({})
    expect(onSubmit.mock.calls[0][1]).toBeUndefined()
  })
  it('submits the selected file only on save and preserves it after rejection', async () => {
    const onSubmit = vi.fn()
    const view = render(<PreparationStepDialog {...props} onSubmit={onSubmit} />)
    const report = new File(['%PDF-TEST ONLY'], 'qc.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('QC report (optional)'), { target: { files: [report] } })
    expect(onSubmit).not.toHaveBeenCalled()
    complete()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][1]).toBe(report)
    view.rerender(<PreparationStepDialog {...props} onSubmit={onSubmit} error="Save rejected" />)
    expect(screen.getByText('Selected: qc.pdf')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove report' }))
    expect(screen.queryByText('Selected: qc.pdf')).toBeNull()
  })
  it('rejects oversized files before submission', async () => {
    const onSubmit = vi.fn()
    render(<PreparationStepDialog {...props} onSubmit={onSubmit} />)
    const report = new File(['%PDF-TEST ONLY'], 'qc.pdf', { type: 'application/pdf' })
    Object.defineProperty(report, 'size', { value: 10 * 1024 * 1024 + 1 })
    fireEvent.change(screen.getByLabelText('QC report (optional)'), { target: { files: [report] } })
    complete()
    await screen.findByText('Choose a nonempty PDF report no larger than 10 MB.')
    expect(onSubmit).not.toHaveBeenCalled()
  })
  it('does not offer uploads until the API supports them', () => {
    render(<PreparationStepDialog {...props} batch={batch} onSubmit={vi.fn()} />)
    expect(screen.queryByLabelText('QC report (optional)')).toBeNull()
    expect(screen.getAllByLabelText(/Synthetic QC record reference/)).toHaveLength(3)
  })
  it('cancels a file selection without submitting it', () => {
    const onSubmit = vi.fn(), onClose = vi.fn()
    render(<PreparationStepDialog {...props} onSubmit={onSubmit} onClose={onClose} />)
    fireEvent.change(screen.getByLabelText('QC report (optional)'), { target: { files: [new File(['%PDF-TEST ONLY'], 'qc.pdf')] } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('automatic preparation specimen reference', () => {
  it('shows per-tube identities and submits scans without accession copying or exception notes', async () => {
    const onSubmit = vi.fn<(input: PreparationStepInput) => void>()
    render(<PreparationStepDialog batch={batch} stage={stage} step={step} action="record" onClose={vi.fn()} onSubmit={onSubmit} onResource={vi.fn()} pending={false} />)
    expect(screen.queryByRole('textbox', { name: /Specimen reference/ })).toBeNull()
    expect(screen.queryByLabelText('Tube exception or QC reason')).toBeNull()
    for (const [i, letter] of ['A', 'B'].entries()) {
      const tube = within(screen.getByText(`A${i + 1} · TUBE-${letter}`).closest('section')!)
      expect(tube.getByText(`CUSTOMER-${letter}`)).toBeTruthy()
      expect(tube.getByText(i === 0 ? 'Human liver' : 'Human kidney')).toBeTruthy()
      fireEvent.click(tube.getByRole('button', { expanded: false }))
      expect(tube.getByRole('link')).toHaveProperty('target', '_blank')
      expect(tube.getByRole('link').textContent).toBe(`ACC-${letter}`)
      const scan = tube.getByLabelText(/Source container barcode/)
      expect(scan).toHaveProperty('value', '')
      fireEvent.change(scan, { target: { value: `TUBE-${letter}` } })
    }
    fireEvent.change(screen.getByLabelText(/Identity checked on/), { target: { value: '2026-09-17' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I performed this step/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm this entry/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save step evidence' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].sharedCaptures).toEqual({ 'identity-checked-on': '2026-09-17' })
    expect(onSubmit.mock.calls[0][0].tubes).toEqual([
      { memberId: 'A', captures: { source: 'TUBE-A' }, qcOutcome: null, reason: null },
      { memberId: 'B', captures: { source: 'TUBE-B' }, qcOutcome: null, reason: null },
    ])
  })

  it('retains manual capture until the API advertises automatic accession support', () => {
    render(<PreparationStepDialog batch={{ ...batch, automaticSpecimenReferences: undefined }} stage={stage} step={step} action="record" onClose={vi.fn()} onSubmit={vi.fn()} onResource={vi.fn()} pending={false} />)
    for (const button of screen.getAllByRole('button', { expanded: false })) fireEvent.click(button)
    expect(screen.getAllByRole('textbox', { name: /Specimen reference/ })).toHaveLength(3)
  })

  it('retains tube explanations when the protocol includes a QC hold', async () => {
    const onSubmit = vi.fn()
    const qcStep: typeof step = { ...step, qcGate: { scope: 'tube', criteria: 'Assess identity readiness.', outcomes: ['pass', 'fail', 'hold'] } }
    render(<PreparationStepDialog batch={batch} stage={stage} step={qcStep} action="record" onClose={vi.fn()} onSubmit={onSubmit} onResource={vi.fn()} pending={false} />)
    expect(screen.getAllByLabelText('Tube exception or QC reason')).toHaveLength(2)
    const tube = within(screen.getByText('A1 · TUBE-A').closest('section')!)
    fireEvent.change(tube.getByLabelText(/QC outcome/), { target: { value: 'hold' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save step evidence' }))
    await screen.findByText('Tube exception or QC reason is required.')
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('failure from step entry', () => {
  const failureButton = () => screen.getByRole('button', { name: 'Close attempt as failed for A1, tube TUBE-A' })
  const remainingScan = () => within(screen.getByText('A2 · TUBE-B').closest('section')!).getByLabelText(/Source container barcode/)

  it('returns from failure confirmation with the step draft and focus preserved', () => {
    const onFail = vi.fn()
    render(<PreparationStepDialog batch={batch} stage={stage} step={step} action="record" onClose={vi.fn()} onSubmit={vi.fn()} onResource={vi.fn()} onFail={onFail} pending={false} />)
    fireEvent.change(screen.getByLabelText(/Identity checked on/), { target: { value: '2026-09-17' } })
    fireEvent.change(remainingScan(), { target: { value: 'TUBE-B' } })
    fireEvent.click(failureButton())
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Close attempt as failed: A1 · TUBE-A' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to step' }))
    expect(screen.getByLabelText(/Identity checked on/)).toHaveProperty('value', '2026-09-17')
    expect(remainingScan()).toHaveProperty('value', 'TUBE-B')
    expect(document.activeElement).toBe(failureButton())
    expect(onFail).not.toHaveBeenCalled()
  })

  it('requires evidence, prevents duplicate commands and preserves only remaining tube coverage after success', async () => {
    let resolve!: () => void
    const onFail = vi.fn(() => new Promise<void>(done => { resolve = done }))
    const onSubmit = vi.fn()
    render(<PreparationStepDialog batch={batch} stage={stage} step={step} action="record" onClose={vi.fn()} onSubmit={onSubmit} onResource={vi.fn()} onFail={onFail} pending={false} />)
    fireEvent.change(screen.getByLabelText(/Identity checked on/), { target: { value: '2026-09-17' } })
    fireEvent.change(remainingScan(), { target: { value: 'TUBE-B' } })
    fireEvent.change(within(screen.getByText('A1 · TUBE-A').closest('section')!).getByLabelText(/Source container barcode/), { target: { value: 'UNSAVED-SCAN-A' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm this entry/ }))
    fireEvent.click(failureButton())
    fireEvent.click(screen.getByRole('button', { name: 'Close attempt as failed' }))
    await screen.findByText('Record the reason and evidence.')
    expect(onFail).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Failure reason/), { target: { value: 'other' } })
    fireEvent.change(screen.getByLabelText(/Reason and evidence/), { target: { value: 'Synthetic identity mismatch.' } })
    const failureForm = screen.getByRole('button', { name: 'Close attempt as failed' }).closest('form')!
    fireEvent.submit(failureForm)
    fireEvent.submit(failureForm)
    await waitFor(() => expect(onFail).toHaveBeenCalledTimes(1))
    expect(onFail).toHaveBeenCalledWith('A', 'other', 'Synthetic identity mismatch.')
    expect(screen.getByRole('button', { name: 'Back to step' })).toHaveProperty('disabled', true)
    await act(async () => resolve())
    expect(screen.getByRole('status').textContent).toContain('was closed as failed')
    const failedCoverage = screen.getByRole('checkbox', { name: 'A1 · TUBE-A · JOB — Failed (excluded)' })
    expect(failedCoverage).toHaveProperty('disabled', true)
    expect(failedCoverage).toHaveProperty('checked', false)
    const failedCard = within(screen.getByText('A1 · TUBE-A').closest('section')!)
    fireEvent.click(failedCard.getByRole('button', { expanded: false }))
    expect(failedCard.getByText('Failed')).toBeTruthy()
    expect(failedCard.getByText('Synthetic identity mismatch.')).toBeTruthy()
    expect(failedCard.getByText('Unsaved entries — for reference only')).toBeTruthy()
    expect(failedCard.getByText('UNSAVED-SCAN-A')).toBeTruthy()
    expect(failedCard.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Close attempt as failed for A1, tube TUBE-A' })).toBeNull()
    expect(screen.getByLabelText(/Identity checked on/)).toHaveProperty('value', '2026-09-17')
    expect(remainingScan()).toHaveProperty('value', 'TUBE-B')
    expect(screen.getByRole('checkbox', { name: /I confirm this entry/ })).toHaveProperty('checked', false)
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: /I performed this step/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm this entry/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save step evidence' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].coveredMemberIds).toEqual(['B'])
    expect(onSubmit.mock.calls[0][0].tubes.map((tube: { memberId: string }) => tube.memberId)).toEqual(['B'])
  })

  it('retains saved failures after reopening and when skipping without allowing their selection', () => {
    const savedBatch = { ...batch, members: batch.members.map(m => m.id === 'A' ? { ...m, state: 'Failed', failureEvidence: 'Recorded discrepancy.', executions: m.executions.map(e => ({ ...e, status: 'Abandoned' })) } : m) }
    const props = { batch: savedBatch, stage, step: { ...step, required: false }, action: 'record' as const, onClose: vi.fn(), onSubmit: vi.fn(), onResource: vi.fn(), onFail: vi.fn(), pending: false }
    const first = render(<PreparationStepDialog {...props} />)
    expect(screen.getByText('Recorded discrepancy.')).toBeTruthy()
    first.unmount()
    render(<PreparationStepDialog {...props} />)
    expect(screen.getByText(/1 active · 1 failed/)).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /A1.*Failed \(excluded\)/ })).toHaveProperty('disabled', true)
    expect(screen.getAllByLabelText(/Source container barcode/)).toHaveLength(1)
    fireEvent.change(screen.getByLabelText(/Decision/), { target: { value: 'skipped' } })
    expect(screen.getByText('Recorded discrepancy.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Close attempt as failed/ })).toBeNull()
  })

  it('keeps every failed tube visible when none remain eligible and blocks step submission', () => {
    const onSubmit = vi.fn()
    render(<PreparationStepDialog batch={{ ...batch, members: batch.members.map(m => ({ ...m, state: 'Failed', failureEvidence: `Failure ${m.id}` })) }} stage={stage} step={step} action="record" onClose={vi.fn()} onSubmit={onSubmit} onResource={vi.fn()} onFail={vi.fn()} pending={false} />)
    expect(screen.getByText(/0 active · 2 failed/)).toBeTruthy()
    expect(screen.getByText('Failure A')).toBeTruthy()
    expect(screen.getByText('Failure B')).toBeTruthy()
    expect(screen.queryByLabelText(/Source container barcode/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Save step evidence' })).toHaveProperty('disabled', true)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps failure evidence editable after rejection and hides the action without operator permission', async () => {
    const onFail = vi.fn().mockRejectedValue(new Error('Rejected'))
    const props = { batch, stage, step, action: 'record' as const, onClose: vi.fn(), onSubmit: vi.fn(), onResource: vi.fn(), onFail, pending: false }
    const view = render(<PreparationStepDialog {...props} />)
    fireEvent.click(failureButton())
    fireEvent.change(screen.getByLabelText(/Failure reason/), { target: { value: 'other' } })
    fireEvent.change(screen.getByLabelText(/Reason and evidence/), { target: { value: 'Synthetic mismatch.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Close attempt as failed' }))
    await screen.findByRole('alert')
    expect(screen.getByLabelText(/Reason and evidence/)).toHaveProperty('value', 'Synthetic mismatch.')
    fireEvent.click(screen.getByRole('button', { name: 'Back to step' }))
    expect(screen.getByRole('checkbox', { name: 'A1 · TUBE-A · JOB' })).toHaveProperty('checked', true)
    view.rerender(<PreparationStepDialog {...props} batch={{ ...batch, canOperate: false }} />)
    expect(screen.queryByRole('button', { name: /Close attempt as failed/ })).toBeNull()
  })
})


describe('optional preparation report', () => {
  const preparationStep: typeof step = { ...step, captures: [
    { key: 'preparation-record-reference', label: 'Preparation record reference', type: 'text', required: true, scope: 'shared' },
    { key: 'mode', label: 'Preparation mode', type: 'text', required: true, scope: 'shared' },
  ] }
  const props = { batch: { ...batch, optionalPreparationReports: true }, stage, step: preparationStep, action: 'record' as const, onClose: vi.fn(), onResource: vi.fn(), pending: false }
  it.each([false, true])('retains required captures and saves with attachment selected %s', async attach => {
    const onSubmit = vi.fn()
    render(<PreparationStepDialog {...props} onSubmit={onSubmit} />)
    expect(screen.queryByLabelText(/Preparation record reference/)).toBeNull()
    const input = screen.getByLabelText('Preparation report or worksheet (optional)')
    const report = new File(['%PDF-TEST ONLY'], 'worksheet.pdf', { type: 'application/pdf' })
    if (attach) fireEvent.change(input, { target: { files: [report] } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I performed this step/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm this entry/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save step evidence' }))
    await screen.findByText('Preparation mode is required.')
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.change(screen.getAllByLabelText(/Preparation mode/)[0], { target: { value: 'Simulated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save step evidence' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0].sharedCaptures).toEqual({ mode: 'Simulated' })
    expect(onSubmit.mock.calls[0][1]).toBe(attach ? report : undefined)
  })
  it('retains the manual field until the API supports preparation attachments', () => {
    render(<PreparationStepDialog {...props} batch={batch} onSubmit={vi.fn()} />)
    expect(screen.queryByLabelText('Preparation report or worksheet (optional)')).toBeNull()
    expect(screen.getAllByLabelText(/Preparation record reference/).length).toBeGreaterThan(0)
  })
})
