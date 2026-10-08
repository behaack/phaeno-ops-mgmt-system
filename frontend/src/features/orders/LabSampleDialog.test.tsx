import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabSample, LabServiceOrder } from '#/api/order-management'
import { bundleLabDraft } from '#/test-helpers/bundled-orders'
import { LabSampleDialog } from './LabSampleDialog'

const mocks = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn(), close: vi.fn(), saved: vi.fn() }))
vi.mock('#/api/order-management', () => ({ addLabSample: mocks.add, updateLabSample: mocks.update, getOrderErrorMessage: (error: Error) => error.message }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canCreateLabServiceRequests: true } } }) }))

const order = { ...bundleLabDraft, status: 'PlacedAwaitingSamples', canEditSamples: true }
const sample: LabSample = {
  id: 'synthetic-sample', customerSampleId: 'RNA-001', materialType: 'RNA', biologicalSource: 'Yeast', quantity: 2, quantityUnit: 'tubes',
  storageRequirements: 'Frozen', safetyDeclaration: 'Synthetic training sample', collectionDate: null, concentration: null, notes: null,
  analysisDefinitionIdsJson: '[]', accessionId: null, status: 'Expected', replacementForSampleId: null, receivedAt: null, receiptCondition: null,
  carrier: null, trackingNumber: null, customerShippedAt: null, tenantSafeReason: null, internalNote: null, version: 1,
}

beforeEach(() => { vi.clearAllMocks(); mocks.add.mockReset(); mocks.update.mockReset() })
afterEach(() => vi.restoreAllMocks())

function show(existing: LabSample | null) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <LabSampleDialog open order={order} sample={existing} biologicalSource={existing ? undefined : order.sourceGroups[0].biologicalSource} onOpenChange={mocks.close} onSaved={mocks.saved} />
  </QueryClientProvider>)
  return screen.getByRole('dialog', { name: existing ? 'Edit sample details' : 'Add sample' })
}

describe.each([{ mode: 'Add', existing: null }, { mode: 'Edit', existing: sample }])('$mode sample discard protection', ({ existing }) => {
  it('retains an edited identifier after declined Cancel, Close and Escape, then closes only after confirmed discard', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const dialog = show(existing)
    const identifier = within(dialog).getByLabelText(/Customer sample ID/)
    expect(identifier).toHaveProperty('value', existing?.customerSampleId ?? '')
    fireEvent.change(identifier, { target: { value: 'RNA-CHANGED' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(confirm).toHaveBeenCalledTimes(3)
    expect(confirm).toHaveBeenCalledWith('Discard the unsaved sample details?')
    expect(mocks.close).not.toHaveBeenCalled()
    expect(identifier).toHaveProperty('value', 'RNA-CHANGED')
    expect(screen.getByRole('dialog')).toBe(dialog)

    confirm.mockReturnValue(true)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(mocks.close).toHaveBeenCalledExactlyOnceWith(false)
    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.saved).not.toHaveBeenCalled()
  })

  it('closes untouched sample details without a discard warning', () => {
    const confirm = vi.spyOn(window, 'confirm')
    const dialog = show(existing)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(mocks.close).toHaveBeenCalledExactlyOnceWith(false)
    expect(confirm).not.toHaveBeenCalled()
    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.saved).not.toHaveBeenCalled()
  })
})

const groupedOrder: LabServiceOrder = { ...order, requestedSpecimenCount: 3, sourceGroups: [
  { id: 'source-a', biologicalSource: 'fghj', specimenCount: 1, version: 1 },
  { id: 'source-b', biologicalSource: 'fgjh', specimenCount: 2, version: 1 },
], samples: [{ ...sample, id: 'first', biologicalSource: 'fghj', quantity: 20 }] }

function showCapacity(model: LabServiceOrder, existing: LabSample | null = null, biologicalSource?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const view = (current: LabServiceOrder) => <QueryClientProvider client={client}><LabSampleDialog open order={current} sample={existing} biologicalSource={biologicalSource} onOpenChange={mocks.close} onSaved={mocks.saved} /></QueryClientProvider>
  const rendered = render(view(model))
  return { refresh: (next: LabServiceOrder) => rendered.rerender(view(next)) }
}

describe('sample source capacity in Add and Edit', () => {
  it('uses the clicked Add source as read-only context and sends that source', async () => {
    const bothSourcesAvailable = { ...groupedOrder, samples: [] }
    showCapacity(bothSourcesAvailable, null, 'fgjh')
    expect(screen.queryByRole('combobox', { name: /Biological source/ })).toBeNull()
    expect(screen.getByText('fgjh')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Customer sample ID/), { target: { value: 'RNA-NEW' } })
    mocks.add.mockResolvedValueOnce(groupedOrder)
    fireEvent.click(screen.getByRole('button', { name: 'Add sample' }))
    await waitFor(() => expect(mocks.add).toHaveBeenCalledWith(groupedOrder.id, expect.objectContaining({ customerSampleId: 'RNA-NEW', biologicalSource: 'fgjh', tubeCount: 1, orderVersion: groupedOrder.version })))
  })

  it('blocks a full Add source before the API call without substituting an available source', async () => {
    showCapacity(groupedOrder, null, 'fghj')
    fireEvent.change(screen.getByLabelText(/Customer sample ID/), { target: { value: 'RNA-NEW' } })
    expect(screen.queryByRole('combobox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add sample' }))
    expect(await screen.findByText(/fghj is full \(1 of 1 samples\)/)).toBeTruthy()
    expect(mocks.add).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Customer sample ID/)).toHaveProperty('value', 'RNA-NEW')
  })

  it('blocks Add for the sole accepted source when it is already full', async () => {
    showCapacity({ ...groupedOrder, sourceGroups: [groupedOrder.sourceGroups[0]] }, null, 'fghj')
    fireEvent.change(screen.getByLabelText(/Customer sample ID/), { target: { value: 'RNA-NEW' } })
    expect(screen.getByText('fghj').parentElement?.textContent).toContain('fghj · Full')
    fireEvent.click(screen.getByRole('button', { name: 'Add sample' }))
    expect(await screen.findByText(/fghj is full/)).toBeTruthy()
    expect(mocks.add).not.toHaveBeenCalled()
  })

  it.each([undefined, 'Unknown source'])('blocks Add with missing or unaccepted source context (%s)', async (biologicalSource) => {
    showCapacity(groupedOrder, null, biologicalSource)
    fireEvent.change(screen.getByLabelText(/Customer sample ID/), { target: { value: 'RNA-NEW' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add sample' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', biologicalSource ? 'Select a biological source accepted with this Job.' : 'Biological source is required.')
    expect(mocks.add).not.toHaveBeenCalled()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('permits unchanged-source metadata edits for an already overfull source', async () => {
    const existing = groupedOrder.samples[0]
    const overfull = { ...groupedOrder, samples: [existing, { ...existing, id: 'excess' }] }
    showCapacity(overfull, existing)
    const source = screen.getByRole('combobox', { name: /Biological source/ })
    expect(within(source).getByRole('option', { name: 'fghj · Full' })).toHaveProperty('disabled', false)
    fireEvent.change(screen.getByLabelText(/Quantity/), { target: { value: 3 } })
    mocks.update.mockResolvedValueOnce(overfull)
    fireEvent.click(screen.getByRole('button', { name: 'Save sample details' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(overfull.id, existing.id, expect.objectContaining({ biologicalSource: 'fghj', tubeCount: 3, version: existing.version })))
  })

  it('keeps an existing unknown source editable without silently assigning an accepted one', async () => {
    const existing = { ...sample, biologicalSource: 'Legacy source' }
    const model = { ...groupedOrder, samples: [existing] }
    showCapacity(model, existing)
    expect(screen.getByRole('combobox', { name: /Biological source/ })).toHaveProperty('value', 'Legacy source')
    expect(screen.getByRole('option', { name: 'Legacy source · Not in the accepted list' })).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: /Biological source/ }), { target: { value: 'fgjh' } })
    expect(screen.getByRole('option', { name: 'Legacy source · Not in the accepted list' })).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: /Biological source/ }), { target: { value: 'Legacy source' } })
    fireEvent.change(screen.getByLabelText(/Customer sample ID/), { target: { value: 'RNA-REPAIRED' } })
    mocks.update.mockResolvedValueOnce(model)
    fireEvent.click(screen.getByRole('button', { name: 'Save sample details' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(model.id, existing.id, expect.objectContaining({ customerSampleId: 'RNA-REPAIRED', biologicalSource: 'Legacy source' })))
  })

  it('allows an existing sample to move into an accepted source with room', async () => {
    const existing = groupedOrder.samples[0]
    showCapacity(groupedOrder, existing)
    expect(screen.getByRole('option', { name: 'fghj · 1 sample remaining' })).toHaveProperty('disabled', false)
    fireEvent.change(screen.getByRole('combobox', { name: /Biological source/ }), { target: { value: 'fgjh' } })
    mocks.update.mockResolvedValueOnce(groupedOrder)
    fireEvent.click(screen.getByRole('button', { name: 'Save sample details' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(groupedOrder.id, existing.id, expect.objectContaining({ biologicalSource: 'fgjh', tubeCount: 20 })))
  })

  it('blocks moving an existing sample into a different full source', async () => {
    const existing = { ...sample, id: 'source-b-sample', biologicalSource: 'fgjh' }
    const model = { ...groupedOrder, samples: [...groupedOrder.samples, existing] }
    showCapacity(model, existing)
    expect(screen.getByRole('option', { name: 'fghj · Full' })).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByRole('combobox', { name: /Biological source/ }), { target: { value: 'fghj' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save sample details' }))
    await screen.findByText(/fghj is full/)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('preserves ID, tube count and selected source on background refresh while applying the current capacity', async () => {
    const { refresh } = showCapacity(groupedOrder, null, 'fgjh')
    fireEvent.change(screen.getByLabelText(/Customer sample ID/), { target: { value: 'KEEP-MY-ID' } })
    fireEvent.change(screen.getByLabelText(/Quantity/), { target: { value: 4 } })
    const full = { ...groupedOrder, version: 4, samples: [...groupedOrder.samples, { ...sample, id: 'b-1', biologicalSource: 'fgjh' }, { ...sample, id: 'b-2', biologicalSource: 'fgjh' }] }
    refresh(full)
    expect(screen.getByLabelText(/Customer sample ID/)).toHaveProperty('value', 'KEEP-MY-ID')
    expect(screen.getByLabelText(/Quantity/)).toHaveProperty('value', '4')
    expect(screen.getByText('fgjh').parentElement?.textContent).toContain('fgjh · Full')
    expect(screen.queryByRole('combobox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add sample' }))
    await screen.findByText(/fgjh is full \(2 of 2 samples\)/)
    expect(mocks.add).not.toHaveBeenCalled()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(confirm).toHaveBeenCalledWith('Discard the unsaved sample details?')
    expect(mocks.close).not.toHaveBeenCalled()
  })
})
