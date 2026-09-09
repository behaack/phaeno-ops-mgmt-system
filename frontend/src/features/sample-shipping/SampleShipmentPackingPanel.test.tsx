import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SampleContainerQuantity } from '#/api/sample-shipping'
import type { ContainerRecommendation } from '#/api/shipping-containers'
import { packingFixture, packingRecommendation, shippingContainers } from '#/test-helpers/sample-shipping'
import { PackingDialog } from './SampleShipmentPackingPanel'

const mocks = vi.hoisted(() => ({ preview: vi.fn(), confirm: vi.fn(), close: vi.fn() }))
vi.mock('#/api/sample-shipping', () => ({ previewSampleShipmentPacking: mocks.preview }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
type PreviewInput = { selection?: SampleContainerQuantity[]; availability?: SampleContainerQuantity[] }
function preview(input: PreviewInput): ContainerRecommendation {
  const containers = (input.selection ?? packingRecommendation.containers.map(item => ({ containerDefinitionId: item.containerDefinitionId, quantity: item.quantity }))).map(item => {
    const type = shippingContainers.find(container => container.id === item.containerDefinitionId)!
    const available = input.availability?.find(row => row.containerDefinitionId === item.containerDefinitionId)
    if (available && item.quantity > available.quantity) throw new Error('The selection exceeds the quantity available to you.')
    return { containerDefinitionId: item.containerDefinitionId, sku: type.sku, commonName: type.commonName, capacity: type.tubeCapacity, quantity: item.quantity, assignedTubes: 0, unusedCapacity: 0 }
  })
  let remaining = 30
  for (const item of containers) { item.assignedTubes = Math.min(remaining, item.capacity * item.quantity); item.unusedCapacity = item.capacity * item.quantity - item.assignedTubes; remaining -= item.assignedTubes }
  const totalCapacity = containers.reduce((sum, item) => sum + item.capacity * item.quantity, 0)
  return { tubeCount: 30, containerCount: containers.reduce((sum, item) => sum + item.quantity, 0), totalCapacity, unusedCapacity: Math.max(0, totalCapacity - 30), unallocatedTubes: remaining, isComplete: remaining === 0, containers, explanation: 'Allocation for the containers selected.' }
}
beforeEach(() => { vi.clearAllMocks(); mocks.preview.mockImplementation(async (_: string, input: PreviewInput) => preview(input)) })
afterEach(() => vi.restoreAllMocks())
function show(busy = false, error: unknown = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = (packing = packingFixture) => <QueryClientProvider client={client}><PackingDialog packing={packing} initial={packingRecommendation} busy={busy} error={error} onClose={mocks.close} onConfirm={mocks.confirm} /></QueryClientProvider>
  const rendered = render(view())
  return { refresh: () => rendered.rerender(view({ ...packingFixture, version: 4 })) }
}
function quantity(capacity: number) { return within(screen.getByRole('group', { name: `${capacity}-tube container` })).getByLabelText(/Containers to use/) }
function available(capacity: number) { return within(screen.getByRole('group', { name: `${capacity}-tube container` })).getByLabelText(/Available to you/) }

describe('container adjustment', () => {
  it.each([
    { quantities: [1, 1, 0], tubeCounts: [20, 10] },
    { quantities: [2, 0, 0], tubeCounts: [20, 10] },
    { quantities: [0, 0, 6], tubeCounts: [5, 5, 5, 5, 5, 5] },
  ])('accepts $quantities for 30 tubes without asking why the recommendation changed', async ({ quantities, tubeCounts }) => {
    show()
    for (const [index, capacity] of [20, 10, 5].entries()) fireEvent.change(quantity(capacity), { target: { value: quantities[index] } })
    const confirm = screen.getByRole('button', { name: 'Confirm containers' })
    await waitFor(() => expect(confirm).toHaveProperty('disabled', false))
    fireEvent.click(confirm)
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith({ version: packingFixture.version, selection: quantities.flatMap((value, index) => value ? [{ containerDefinitionId: `container-${[20, 10, 5][index]}`, quantity: value }] : []), containerTubeCounts: tubeCounts }))
    expect(screen.queryByLabelText(/reason/i)).toBeNull()
    expect(screen.getByText('SKU 000-20 · 20 tubes per container')).toBeTruthy()
  })

  it('shows the exact shortfall and permits preparing only the allocated tubes', async () => {
    show()
    fireEvent.change(quantity(20), { target: { value: 0 } })
    const prepare = await screen.findByRole('button', { name: 'Prepare available containers' })
    expect(await screen.findByText(/20 tubes still need a container/)).toBeTruthy()
    fireEvent.click(prepare)
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith({ version: 3, selection: [{ containerDefinitionId: 'container-10', quantity: 1 }], containerTubeCounts: [10] }))
  })

  it('keeps explicit zero availability and blocks a selection exceeding it', async () => {
    show()
    fireEvent.change(available(20), { target: { value: 0 } })
    expect(await screen.findByText(/selection exceeds the quantity available/)).toBeTruthy()
    expect(mocks.preview).toHaveBeenLastCalledWith(packingFixture.shipmentId, expect.objectContaining({ availability: [{ containerDefinitionId: 'container-20', quantity: 0 }] }))
    expect(screen.getByRole('button', { name: 'Confirm containers' })).toHaveProperty('disabled', true)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('does not create shipments from an empty selection', async () => {
    show()
    fireEvent.change(quantity(20), { target: { value: 0 } })
    fireEvent.change(quantity(10), { target: { value: 0 } })
    expect(await screen.findByText('Choose at least one compatible container to prepare a shipment.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Prepare available containers' })).toHaveProperty('disabled', true)
  })

  it('retains adjustments after a declined discard and exposes a server error with the draft', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    show(false, new Error('The shipment changed. Review the current tube list.'))
    fireEvent.change(quantity(20), { target: { value: 2 } })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(confirm).toHaveBeenCalledWith('Discard the unsaved container selection?')
    expect(quantity(20)).toHaveProperty('value', '2')
    expect(mocks.close).not.toHaveBeenCalled()
    expect(screen.getByText(/shipment changed/)).toBeTruthy()
  })

  it('blocks dismissal and edits while confirming containers', () => {
    show(true)
    expect(quantity(20)).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Keep reviewing' })).toHaveProperty('disabled', true)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(mocks.close).not.toHaveBeenCalled()
  })

  it('permits a 15+15 distribution across two 20-tube containers', async () => {
    show()
    fireEvent.change(quantity(20), { target: { value: 2 } })
    fireEvent.change(quantity(10), { target: { value: 0 } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm containers' })).toHaveProperty('disabled', false))
    fireEvent.change(screen.getByLabelText(/Tubes to pack · 20-tube container #1/), { target: { value: 15 } })
    fireEvent.change(screen.getByLabelText(/Tubes to pack · 20-tube container #2/), { target: { value: 15 } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm containers' }))
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith({ version: 3, selection: [{ containerDefinitionId: 'container-20', quantity: 2 }], containerTubeCounts: [15, 15] }))
  })

  it('blocks overfilled containers and a tube allocation with the wrong total', async () => {
    show()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm containers' })).toHaveProperty('disabled', false))
    fireEvent.change(screen.getByLabelText(/Tubes to pack · 20-tube container #1/), { target: { value: 21 } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm containers' }))
    expect(await screen.findByText('This container holds at most 20 tubes.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Tubes to pack · 20-tube container #1/), { target: { value: 19 } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm containers' }))
    expect(await screen.findByText(/Assign exactly 30 tubes across these containers/)).toBeTruthy()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('preserves a typed distribution and original concurrency version during background refresh', async () => {
    const { refresh } = show()
    fireEvent.change(quantity(20), { target: { value: 2 } })
    fireEvent.change(quantity(10), { target: { value: 0 } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm containers' })).toHaveProperty('disabled', false))
    fireEvent.change(screen.getByLabelText(/Tubes to pack · 20-tube container #1/), { target: { value: 15 } })
    fireEvent.change(screen.getByLabelText(/Tubes to pack · 20-tube container #2/), { target: { value: 15 } })
    refresh()
    expect(screen.getByLabelText(/Tubes to pack · 20-tube container #1/)).toHaveProperty('value', '15')
    expect(screen.getByLabelText(/Tubes to pack · 20-tube container #2/)).toHaveProperty('value', '15')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm containers' }))
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ version: 3, containerTubeCounts: [15, 15] })))
  })
})
