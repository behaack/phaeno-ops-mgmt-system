import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TrialFormDialog } from './TrialFormDialog'
import { requiredTrialInputs } from './trial-presentation'
import { trialScope } from '#/test-helpers/trials'

describe('Trial bounded actions', () => {
  it('requires explicit RUO and no-PHI confirmation', async () => {
    const submit = vi.fn().mockResolvedValue(undefined)
    render(<TrialFormDialog title="Accept Trial" description="Review approved terms" fields={[{ name: 'ruo', label: 'Research use only and no PHI', type: 'checkbox', required: true }]} onClose={vi.fn()} onSubmit={submit}><p>For Research Use Only. Not for use in diagnostic procedures.</p></TrialFormDialog>)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('alert'); expect(submit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Research use only and no PHI' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ ruo: 'yes' }, expect.any(String)))
  })
  it('preserves entered values while explicitly reloading a concurrency conflict', async () => {
    let version = 4
    const sent: number[] = []
    const reload = vi.fn().mockImplementation(async () => { version = 5 })
    const submit = vi.fn().mockImplementation(async () => { sent.push(version); if (version === 4) throw new Error('This Trial changed.') })
    render(<TrialFormDialog title="Schedule" description="Update estimate" fields={[{ name: 'estimate', label: 'Estimate', required: true }]} onClose={vi.fn()} onReload={reload} onSubmit={submit} />)
    fireEvent.change(screen.getByLabelText('Estimate*'), { target: { value: 'Next week' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Reload current Trial; keep my entries' }))
    await screen.findByRole('status'); expect((screen.getByLabelText('Estimate*') as HTMLInputElement).value).toBe('Next week')
    fireEvent.click(screen.getByRole('button', { name: 'Save' })); await waitFor(() => expect(sent).toEqual([4, 5]))
    expect(submit.mock.calls[0][1]).not.toBe(submit.mock.calls[1][1])
  })
  it('collects every frozen PSeq required input without duplicating standard sample fields', () => {
    expect(requiredTrialInputs(trialScope)).toEqual(['organism'])
    expect(requiredTrialInputs({ ...trialScope, analyses: [...trialScope.analyses, { ...trialScope.analyses[0], requiredInputsJson: '{"required":["organism","tissue"]}' }] })).toEqual(['organism', 'tissue'])
  })
})
