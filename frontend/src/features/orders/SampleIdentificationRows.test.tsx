import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabServiceOrder } from '#/api/order-management'
import { SampleIdentificationRows } from './SampleIdentificationRows'

const api = vi.hoisted(() => ({ add: vi.fn(), get: vi.fn() }))
vi.mock('#/api/order-management', () => ({ addLabSample: api.add, getLabOrder: api.get, getOrderErrorMessage: (error: Error) => error.message }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk' }) }))
const order = { id: 'job', version: 4, canEditSamples: true, requestedSpecimenCount: 3,
  sourceGroups: [{ id: 'source', biologicalSource: 'Human kidney', specimenCount: 3 }], samples: [],
} as unknown as LabServiceOrder
function withSample(value: LabServiceOrder, id: string): LabServiceOrder {
  return { ...value, version: value.version + 1, samples: [...value.samples,
    { id, customerSampleId: id, biologicalSource: 'Human kidney', quantity: 1 } as LabServiceOrder['samples'][number]] }
}
function show(value = order) {
  const onSaved = vi.fn()
  const dirty = vi.fn()
  function Harness() {
    const [current, setCurrent] = useState(value)
    return <SampleIdentificationRows order={current} source="Human kidney" expectedCount={3} savedCount={current.samples.length}
      disabled={false} onDirtyChange={dirty} onBusyChange={vi.fn()} onSaved={async saved => { onSaved(saved); setCurrent(saved) }} />
  }
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><Harness /></QueryClientProvider>)
  return { onSaved, dirty }
}
function enter(index: number, value: string) {
  fireEvent.change(screen.getAllByRole('textbox')[index], { target: { value } })
}
function save() { fireEvent.click(screen.getByRole('button', { name: 'Save sample IDs' })) }

beforeEach(() => { vi.resetAllMocks() })
describe('Expected sample identification rows', () => {
  it('fixes runs to accepted one-per-sample pricing while allowing extra reserve tubes', async () => {
    api.add.mockResolvedValue(withSample(order, 'S-1'))
    show()
    expect(screen.getByLabelText('Sequencing runs 1 for Human kidney').tagName).toBe('OUTPUT')
    expect(screen.queryByRole('spinbutton', { name: 'Sequencing runs 1 for Human kidney' })).toBeNull()
    enter(0, 'S-1')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Tube count 1 for Human kidney' }), { target: { value: '3' } })
    save()
    await waitFor(() => expect(api.add).toHaveBeenCalledWith('job', expect.objectContaining({ tubeCount: 3, sequencingRunCount: 1 })))
  })

  it('retains allocation for explicitly purchased additional runs', () => {
    show({ ...order, requestedSequencingRunCount: 5 })
    expect(screen.getByRole('spinbutton', { name: 'Sequencing runs 1 for Human kidney' })).toBeTruthy()
  })
  it('displays every expected row with one tube and no persisted placeholders', () => {
    const { dirty } = show()
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
    expect(screen.getAllByRole('spinbutton').every(input => (input as HTMLInputElement).value === '1')).toBe(true)
    expect(api.add).not.toHaveBeenCalled()
    enter(0, 'S-1')
    expect(dirty).toHaveBeenLastCalledWith(true)
    enter(0, '')
    expect(dirty).toHaveBeenLastCalledWith(false)
    expect(screen.getByRole('button', { name: 'Save sample IDs' })).toHaveProperty('disabled', true)
  })
  it('skips blanks and chains returned versions when saving entered IDs', async () => {
    const first = withSample(order, 'S-1')
    const second = withSample(first, 'S-2')
    api.add.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    const { onSaved } = show()
    enter(0, ' S-1 ')
    enter(2, 'S-2')
    save()
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(second))
    expect(api.add).toHaveBeenCalledTimes(2)
    expect(api.add).toHaveBeenNthCalledWith(1, 'job', { customerSampleId: 'S-1', biologicalSource: 'Human kidney', tubeCount: 1, sequencingRunCount: 1, orderVersion: 4 })
    expect(api.add).toHaveBeenNthCalledWith(2, 'job', { customerSampleId: 'S-2', biologicalSource: 'Human kidney', tubeCount: 1, sequencingRunCount: 1, orderVersion: 5 })
    expect(screen.getAllByRole('textbox').every(input => !(input as HTMLInputElement).value)).toBe(true)
  })
  it('rejects duplicate IDs across saved samples and draft rows before writing', async () => {
    show(withSample(order, 'S-1'))
    enter(0, 's-1')
    enter(1, ' S-1 ')
    save()
    await waitFor(() => expect(screen.getAllByText('Use a unique sample ID within this Job.')).toHaveLength(2))
    expect(api.add).not.toHaveBeenCalled()
  })
  it('rejects invalid tube counts and retains the ID for correction', async () => {
    show()
    enter(0, 'S-1')
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '0' } })
    save()
    await screen.findByText('Enter a whole number of at least one tube.')
    expect(api.add).not.toHaveBeenCalled()
    expect(screen.getAllByRole('textbox')[0]).toHaveProperty('value', 'S-1')
  })
  it('preserves unsaved IDs after a partial failure and refreshes confirmed saves', async () => {
    const first = withSample(order, 'S-1')
    api.add.mockResolvedValueOnce(first).mockRejectedValueOnce(new Error('Please retry'))
    api.get.mockResolvedValue(first)
    const { onSaved, dirty } = show()
    enter(0, 'S-1')
    enter(1, 'S-2')
    save()
    await screen.findByText('Please retry')
    expect(onSaved).toHaveBeenCalledWith(first)
    expect(screen.getAllByRole('textbox').map(input => (input as HTMLInputElement).value)).toEqual(['S-2', ''])
    expect(dirty).toHaveBeenLastCalledWith(true)
  })
  it('reconciles a saved row after a lost response instead of offering it again', async () => {
    api.add.mockRejectedValue(new Error('Connection interrupted'))
    api.get.mockResolvedValue(withSample(order, 'S-1'))
    const { onSaved, dirty } = show()
    enter(0, 'S-1')
    save()
    await screen.findByText('Connection interrupted')
    expect(onSaved).toHaveBeenCalledWith(withSample(order, 'S-1'))
    expect(screen.getAllByRole('textbox').every(input => !(input as HTMLInputElement).value)).toBe(true)
    expect(dirty).toHaveBeenLastCalledWith(false)
  })
})
