import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PreparationDetail, PreparationMember } from '#/api/lab-preparation'
import { PreparationOutputsDialog } from './PreparationOutputsDialog'

const members = ['A1', 'A2'].map((position, index) => ({ id: String(index), position, barcode: `SOURCE-${index}`, state: 'InProgress', output: null, blocker: null })) as PreparationMember[]
const output = { id: 'out', barcode: 'PH-L-TEST', quantity: 5, quantityUnit: 'uL', confirmed: false }
function show(onSubmit = vi.fn(), extra: Partial<Parameters<typeof PreparationOutputsDialog>[0]> = {}) {
  return render(<PreparationOutputsDialog members={members} supported pending={false} onClose={vi.fn()} onSubmit={onSubmit} {...extra} />)
}
function fill() {
  fireEvent.change(screen.getByLabelText('Quantity unit', { exact: false }), { target: { value: 'uL' } })
  fireEvent.change(screen.getByLabelText('Storage location', { exact: false }), { target: { value: 'BOX' } })
  screen.getAllByLabelText(/Actual output quantity/).forEach((input, index) => fireEvent.change(input, { target: { value: String(index + 5) } }))
}

describe('shared library outputs', () => {
  it('requires every quantity and submits shared defaults with individual overrides in one request', async () => {
    const submit = vi.fn().mockResolvedValue({ members: members.map(m => ({ ...m, output: { ...output, barcode: `OUT-${m.position}` } })) } as PreparationDetail)
    show(submit)
    expect(screen.queryByRole('combobox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Create library outputs' }))
    await screen.findByText('Enter the shared quantity unit.')
    expect(submit).not.toHaveBeenCalled()
    fill()
    const second = within(screen.getByRole('region', { name: 'Output for A2' }))
    fireEvent.change(second.getByLabelText('Unit override (optional)'), { target: { value: 'mL' } })
    fireEvent.change(second.getByLabelText('Location override (optional)'), { target: { value: 'BOX-2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create library outputs' }))
    await screen.findByRole('button', { name: 'Done' })
    expect(submit).toHaveBeenCalledExactlyOnceWith([
      { memberId: '0', quantity: 5, quantityUnit: 'uL', location: 'BOX' },
      { memberId: '1', quantity: 6, quantityUnit: 'mL', location: 'BOX-2' },
    ])
    expect(screen.getByText('Output: OUT-A1')).toBeTruthy()
    expect(screen.getByText('Output: OUT-A2')).toBeTruthy()
  })

  it('retains the original rows and request values after an uncertain response and refresh', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('Response lost'))
    const props = { members, supported: true, pending: false, onClose: vi.fn(), onSubmit: submit }
    const view = render(<PreparationOutputsDialog {...props} />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Create library outputs' }))
    await screen.findByRole('alert')
    view.rerender(<PreparationOutputsDialog {...props} members={members.map(m => ({ ...m, output }))} />)
    expect(screen.getAllByLabelText(/Actual output quantity/)).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Create library outputs' }))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
    expect(submit.mock.calls[1][0]).toEqual(submit.mock.calls[0][0])
  })

  it('shows existing outputs and unavailable tubes without offering duplicate creation', () => {
    show(vi.fn(), { members: [members[0], { ...members[1], output }, { ...members[1], id: 'failed', position: 'B1', state: 'Failed' }] })
    expect(screen.getAllByLabelText(/Actual output quantity/)).toHaveLength(1)
    expect(screen.getByText('Existing output: PH-L-TEST')).toBeTruthy()
    expect(screen.getByText('Output unavailable: Failed')).toBeTruthy()
  })

  it('does not submit on cancel or when the API has not enabled bulk outputs', () => {
    const submit = vi.fn(), close = vi.fn()
    show(submit, { supported: false, onClose: close })
    expect(screen.getByRole('button', { name: 'Create library outputs' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(close).toHaveBeenCalledOnce()
    expect(submit).not.toHaveBeenCalled()
  })
})
