import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { trialConfiguration, trialDetail, trialScope } from '#/test-helpers/trials'
import { TrialSampleDialog, trialSamplePayload, trialSampleSchema } from './TrialSampleDialog'

const { blocker } = vi.hoisted(() => ({ blocker: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: blocker }))

const trial = { ...trialDetail, canAccept: false, canSubmit: true, status: 'AwaitingSamples', acceptedScopeRevision: 1 }
const row = { reference: 'RNA-1', biologicalSource: 'Research RNA', tubeCount: '2', quantity: '100', concentration: '', storageRequirements: 'Frozen', safetyDeclaration: 'Nonhazardous', inputs: { organism: 'Synthetic organism' }, replacementAuthorizationId: '' }
const values = { destinationId: 'destination-1', sampleTypeId: 'rna', confirmed: true, samples: [row, { ...row, reference: 'RNA-2' }] }

describe('Trial sample roster', () => {
  it('submits all reviewed rows together using the configured quantity unit', () => {
    const parsed = trialSampleSchema(trial, trialConfiguration).parse(values)
    expect(trialSamplePayload(parsed, trial, trialConfiguration)).toMatchObject({ destinationId: 'destination-1', sampleTypeId: 'rna', version: 4, samples: [{ reference: 'RNA-1', quantity: 100, quantityUnit: 'ng', tubeCount: 2 }, { reference: 'RNA-2', quantity: 100, quantityUnit: 'ng', tubeCount: 2 }] })
  })
  it('validates minimum, maximum and dynamically required concentration at their controls', () => {
    const scope = { ...trialScope, analyses: [{ ...trialScope.analyses[0], requiredInputsJson: '["organism","concentration"]' }] }
    const result = trialSampleSchema({ ...trial, scope }, trialConfiguration).safeParse({ ...values, samples: [{ ...row, quantity: '49' }, { ...row, reference: 'RNA-2', quantity: '501' }] })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map(issue => issue.path.join('.'))).toEqual(expect.arrayContaining(['samples.0.quantity', 'samples.1.quantity', 'samples.0.concentration', 'samples.1.concentration']))
  })
  it('revalidates preserved rows against current allowance, references and replacement availability', () => {
    const current = { ...trial, originalSamplesRemaining: 1 }
    expect(trialSampleSchema(current, trialConfiguration).safeParse(values).success).toBe(false)
    const duplicate = trialSampleSchema(trial, trialConfiguration).safeParse({ ...values, samples: [row, { ...row }] })
    expect(duplicate.success).toBe(false)
    expect(trialSampleSchema(trial, trialConfiguration).safeParse({ ...values, samples: [{ ...row, replacementAuthorizationId: 'no-longer-eligible' }] }).success).toBe(false)
  })
  it('locks the roster during reload, preserves it on failure and renews confirmation after changed-scope recovery', async () => {
    let rejectReload!: (error: Error) => void
    const latest = { trial: { ...trial, version: 5, scope: { ...trial.scope!, revision: 2 } }, configuration: trialConfiguration }
    const reload = vi.fn().mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectReload = reject })).mockResolvedValue(latest)
    const submit = vi.fn().mockRejectedValueOnce(new Error('Trial changed')).mockResolvedValue(undefined)
    const close = vi.fn(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<TrialSampleDialog trial={trial} configuration={trialConfiguration} onReload={reload} onSubmit={submit} onClose={close} />)
    for (const [label, value] of Object.entries({ 'Coded sample reference': 'RNA-1', 'Biological source': 'Research RNA', 'Quantity (ng)': '100', 'Storage requirements': 'Frozen', 'Research material safety declaration': 'Nonhazardous', Organism: 'Synthetic organism' })) fireEvent.change(screen.getByLabelText(`${label}*`), { target: { value } })
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Submit 1 sample' }))
    await screen.findByText('Trial changed'); fireEvent.click(screen.getByRole('button', { name: 'Reload current Trial; keep my entries' }))
    expect(screen.getByRole('status').textContent).toContain('Reloading current Trial and sample requirements')
    expect(screen.getByRole('form', { name: 'Trial sample roster' }).tabIndex).toBe(0)
    screen.getByRole('form', { name: 'Trial sample roster' }).focus()
    expect(document.activeElement).toBe(screen.getByRole('form', { name: 'Trial sample roster' }))
    expect(screen.getByLabelText('Coded sample reference*').matches(':disabled')).toBe(true); expect(screen.getByRole('checkbox').matches(':disabled')).toBe(true)
    for (const name of ['Add another sample', 'Remove sample 1', 'Submit 1 sample', 'Cancel', 'Reloading…']) expect(screen.getByRole('button', { name }).matches(':disabled')).toBe(true)
    expect(blocker.mock.lastCall![0].shouldBlockFn()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Reloading…' })); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await act(async () => { fireEvent.submit(document.getElementById('trial-samples')!) })
    expect(submit).toHaveBeenCalledOnce(); expect(reload).toHaveBeenCalledOnce(); expect(close).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled()
    await act(async () => { rejectReload(new Error('Refresh unavailable')) })
    expect(await screen.findByText('Refresh unavailable')).toBeTruthy()
    expect((screen.getByLabelText('Coded sample reference*') as HTMLInputElement).value).toBe('RNA-1'); expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
    expect(screen.getByRole('button', { name: 'Submit 1 sample' }).matches(':disabled')).toBe(false)
    expect(screen.getByRole('form', { name: 'Trial sample roster' }).hasAttribute('tabindex')).toBe(false)
    expect(blocker.mock.lastCall![0].shouldBlockFn()).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Reload current Trial; keep my entries' }))
    await screen.findByText(/The approved scope changed/)
    expect((screen.getByLabelText('Coded sample reference*') as HTMLInputElement).value).toBe('RNA-1'); expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Submit 1 sample' }))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
    expect(submit.mock.calls[1][0]).toMatchObject({ version: 5, samples: [{ reference: 'RNA-1', quantity: 100 }] })
    expect(submit.mock.calls[1][1]).not.toEqual(submit.mock.calls[0][1]); confirm.mockRestore()
  })
})
