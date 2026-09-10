import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SampleContainerQuantity, SampleShipmentPacking } from '#/api/sample-shipping'
import type { ContainerRecommendation } from '#/api/shipping-containers'
import { packingFixture, packingRecommendation, shippingContainers, shippingFixture } from '#/test-helpers/sample-shipping'
import { locationKit } from '#/test-helpers/location-kit-inventory'
import { PackingDialog, SampleShipmentPackingPanel } from './SampleShipmentPackingPanel'

const mocks = vi.hoisted(() => ({ preview: vi.fn(), confirm: vi.fn(), close: vi.fn(), packing: vi.fn() }))
vi.mock('#/api/sample-shipping', () => ({ previewSampleShipmentPacking: mocks.preview, getSampleShipmentPacking: mocks.packing, confirmSampleShipmentPacking: mocks.confirm }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn(), useBlocker: vi.fn() }))

type PreviewInput = { selection?: SampleContainerQuantity[] }
let currentPacking = packingFixture
let currentRecommendation = packingRecommendation
function preview(input: PreviewInput, tubeCount = currentPacking.tubeCount): ContainerRecommendation {
  const containers = (input.selection ?? currentRecommendation.containers.map(item => ({ containerDefinitionId: item.containerDefinitionId, quantity: item.quantity }))).map(item => {
    const type = shippingContainers.find(container => container.id === item.containerDefinitionId)!
    return { containerDefinitionId: item.containerDefinitionId, sku: type.sku, commonName: type.commonName, capacity: type.tubeCapacity, quantity: item.quantity, assignedTubes: 0, unusedCapacity: 0 }
  })
  let remaining = tubeCount
  for (const item of containers) { item.assignedTubes = Math.min(remaining, item.capacity * item.quantity); item.unusedCapacity = item.capacity * item.quantity - item.assignedTubes; remaining -= item.assignedTubes }
  const totalCapacity = containers.reduce((sum, item) => sum + item.capacity * item.quantity, 0)
  return { tubeCount, containerCount: containers.reduce((sum, item) => sum + item.quantity, 0), totalCapacity, unusedCapacity: Math.max(0, totalCapacity - tubeCount), unallocatedTubes: remaining, isComplete: remaining === 0, containers, explanation: 'Allocation for the containers selected.' }
}
beforeEach(() => {
  vi.clearAllMocks()
  currentPacking = packingFixture
  currentRecommendation = packingRecommendation
  mocks.preview.mockImplementation(async (_: string, input: PreviewInput) => preview(input))
  mocks.packing.mockResolvedValue(packingFixture)
})
afterEach(() => vi.restoreAllMocks())

function show(busy = false, error: unknown = null, packing: SampleShipmentPacking = packingFixture, initial = packingRecommendation, availableKits?: SampleContainerQuantity[]) {
  currentPacking = packing
  currentRecommendation = initial
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = (value = packing, kits = availableKits) => <QueryClientProvider client={client}><PackingDialog packing={value} initial={initial} availableKits={kits} busy={busy} error={error} onClose={mocks.close} onConfirm={mocks.confirm} /></QueryClientProvider>
  const rendered = render(view())
  return { refresh: () => rendered.rerender(view({ ...packing, version: packing.version + 1 })), refreshKits: (kits: SampleContainerQuantity[]) => rendered.rerender(view(packing, kits)) }
}
function showCount(tubeCount: number, selection: SampleContainerQuantity[]) {
  return show(false, null, { ...packingFixture, tubeCount }, preview({ selection }, tubeCount))
}

describe('physical location-container confirmation', () => {
  function physical() {
    const packing = { ...packingFixture, deliveryLocationId: 'location-1', availableKits: [locationKit(20), locationKit(10)] }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const quantities = [{ containerDefinitionId: 'container-20', quantity: 1 }, { containerDefinitionId: 'container-10', quantity: 1 }]
    const view = (blocked = false, value = packing, error: unknown = null) => <QueryClientProvider client={client}><PackingDialog packing={value} initial={packingRecommendation} availableKits={quantities} locationInventory writesBlocked={blocked} busy={false} error={error} onClose={mocks.close} onConfirm={mocks.confirm} /></QueryClientProvider>
    const rendered = render(view())
    return { refresh: (blocked = false, value = packing, error: unknown = null) => rendered.rerender(view(blocked, value, error)), packing }
  }
  function barcode(index: number) { return screen.getByRole('textbox', { name: `Container ${index} barcode` }) }
  function scan(index: number, value: string) { fireEvent.change(barcode(index), { target: { value } }); fireEvent.keyDown(barcode(index), { key: 'Enter' }) }
  it('requires the physical barcode and rejects unknown or wrong-size containers without reserving', async () => {
    physical()
    await confirm()
    expect(await screen.findByText('Scan the barcode on this physical container.')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(barcode(1)))
    scan(1, 'UNKNOWN-CONTAINER')
    expect(await screen.findByText(/This container is not available at the selected location/)).toBeTruthy()
    scan(1, 'KIT-10')
    expect(await screen.findByText(/This barcode belongs to a different container size/)).toBeTruthy()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })
  it('normalizes scanned identities and reserves their exact versions only on confirmation', async () => {
    physical()
    scan(1, ' kit-20 ')
    scan(2, 'kit-10')
    expect(mocks.confirm).not.toHaveBeenCalled()
    await confirm()
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ deliveryLocationId: 'location-1', stockKits: [{ stockKitId: 'stock-20', version: 4 }, { stockKitId: 'stock-10', version: 4 }], containerTubeCounts: [20, 10] })))
  })
  it('retains barcode and tube drafts while refresh blocks writes, and explains a lost concurrent claim', async () => {
    const { refresh, packing } = physical()
    scan(1, 'KIT-20'); scan(2, 'KIT-10')
    refresh(true)
    expect(barcode(1)).toHaveProperty('value', 'KIT-20')
    expect(tubes(1)).toHaveProperty('value', '20')
    expect(screen.getByRole('button', { name: 'Confirm containers' })).toHaveProperty('disabled', true)
    refresh(false, { ...packing, availableKits: [locationKit(10)] }, new Error('KIT-20 was claimed by another Job.'))
    await confirm()
    expect(await screen.findByText(/This container is not available at the selected location/)).toBeTruthy()
    expect(barcode(1)).toHaveProperty('value', 'KIT-20')
    expect(mocks.confirm).not.toHaveBeenCalled()
  })
  it('does not identify one physical container twice', async () => {
    physical()
    scan(1, 'KIT-20')
    fireEvent.change(barcode(2), { target: { value: 'KIT-20' } })
    await confirm()
    expect(await screen.findByText('This container is already selected in another row.')).toBeTruthy()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })
})
function container(number: number) { return screen.getByRole('group', { name: `Container ${number}` }) }
function size(number: number) { return within(container(number)).getByRole('combobox', { name: `Container size for container ${number}` }) }
function tubes(number: number) { return within(container(number)).getByRole('spinbutton', { name: /^Tubes to pack/ }) }
function offeredSizes(number: number) { return Array.from((size(number) as HTMLSelectElement).options).map(option => Number(option.value.replace('container-', ''))).sort((left, right) => left - right) }
function changeSize(number: number, capacity: number) { fireEvent.change(size(number), { target: { value: `container-${capacity}` } }) }
function pack(number: number, count: number) { fireEvent.change(tubes(number), { target: { value: count } }) }
function remove(number: number) { fireEvent.click(screen.getByRole('button', { name: `Remove container ${number}` })) }
function addButton() { return screen.getByRole('button', { name: 'Add container' }) }
async function add(number: number) {
  fireEvent.click(addButton())
  await waitFor(() => expect(size(number)).toBe(document.activeElement))
}
async function confirm() {
  const button = screen.getByRole('button', { name: 'Confirm containers' })
  await waitFor(() => expect(button).toHaveProperty('disabled', false))
  fireEvent.click(button)
}


describe('individual shipping-container adjustment', () => {
  it('offers only received Job sizes and never adds more than the received quantity', async () => {
    show(false, null, packingFixture, packingRecommendation, [{ containerDefinitionId: 'container-20', quantity: 1 }, { containerDefinitionId: 'container-10', quantity: 1 }])
    expect(offeredSizes(1)).toEqual([20])
    expect(offeredSizes(2)).toEqual([10])
    remove(2)
    expect(addButton()).toHaveProperty('disabled', false)
    await add(2)
    expect(size(2)).toHaveProperty('value', 'container-10')
    expect(addButton()).toHaveProperty('disabled', true)
    await confirm()
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ selection: [{ containerDefinitionId: 'container-20', quantity: 1 }, { containerDefinitionId: 'container-10', quantity: 1 }] })))
  })

  it('uses only an acknowledged partial delivery and leaves remaining tubes unallocated', async () => {
    show(false, null, packingFixture, packingRecommendation, [{ containerDefinitionId: 'container-10', quantity: 1 }])
    expect(size(1)).toHaveProperty('value', 'container-10')
    expect(tubes(1)).toHaveProperty('value', '10')
    expect(screen.queryByRole('group', { name: 'Container 2' })).toBeNull()
    expect(addButton()).toHaveProperty('disabled', true)
    const submit = await screen.findByRole('button', { name: 'Prepare available containers' })
    await waitFor(() => expect(submit).toHaveProperty('disabled', false))
    fireEvent.click(submit)
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ selection: [{ containerDefinitionId: 'container-10', quantity: 1 }], containerTubeCounts: [10] })))
  })

  it('retains row edits when received supply changes and blocks unavailable selection until refreshed', async () => {
    const kits = [{ containerDefinitionId: 'container-20', quantity: 1 }, { containerDefinitionId: 'container-10', quantity: 1 }]
    const view = show(false, null, packingFixture, packingRecommendation, kits)
    pack(1, 19)
    view.refreshKits([{ containerDefinitionId: 'container-20', quantity: 1 }])
    expect(screen.getByText('Received kits changed')).toBeTruthy()
    expect(tubes(1)).toHaveProperty('value', '19')
    expect(size(2)).toHaveProperty('value', 'container-10')
    expect(screen.getByRole('button', { name: /Confirm containers|Prepare available containers/ })).toHaveProperty('disabled', true)
    expect(mocks.confirm).not.toHaveBeenCalled()
    view.refreshKits(kits)
    expect(screen.queryByText('Received kits changed')).toBeNull()
    pack(1, 20)
    await confirm()
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1))
  })

  it('cannot add containers with zero received supply even when the compatible catalog is populated', () => {
    show(false, null, packingFixture, packingRecommendation, [])
    expect(screen.queryByRole('group', { name: 'Container 1' })).toBeNull()
    expect(addButton()).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Confirm containers' })).toHaveProperty('disabled', true)
  })

  it('waits for the received-supply recommendation before opening configuration', async () => {
    let resolve!: (value: ContainerRecommendation) => void
    mocks.preview.mockReturnValue(new Promise<ContainerRecommendation>(done => { resolve = done }))
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SampleShipmentPackingPanel shipment={{ ...shippingFixture, isPackingPool: true }} canManage availableKits={[{ containerDefinitionId: 'container-20', quantity: 1 }, { containerDefinitionId: 'container-10', quantity: 1 }]} /></QueryClientProvider>)
    const adjust = await screen.findByRole('button', { name: 'Adjust containers' })
    expect(adjust).toHaveProperty('disabled', true)
    fireEvent.click(adjust)
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(async () => resolve(packingRecommendation))
    await waitFor(() => expect(adjust).toHaveProperty('disabled', false))
    fireEvent.click(adjust)
    expect(size(1)).toHaveProperty('value', 'container-20')
    expect(size(2)).toHaveProperty('value', 'container-10')
  })

  it.each([
    { capacities: [20, 10], tubeCounts: [20, 10], selection: [{ containerDefinitionId: 'container-20', quantity: 1 }, { containerDefinitionId: 'container-10', quantity: 1 }] },
    { capacities: [5, 5, 5, 5, 5, 5], tubeCounts: [5, 5, 5, 5, 5, 5], selection: [{ containerDefinitionId: 'container-5', quantity: 6 }] },
  ])('accepts $capacities for 30 tubes without requiring a reason', async ({ capacities, tubeCounts, selection }) => {
    show()
    expect(size(1)).toHaveProperty('value', 'container-20')
    expect(size(2)).toHaveProperty('value', 'container-10')
    expect(tubes(1)).toHaveProperty('value', '20')
    expect(tubes(2)).toHaveProperty('value', '10')
    for (const [index, capacity] of capacities.entries()) {
      if (index >= 2) await add(index + 1)
      if ((size(index + 1) as HTMLSelectElement).value !== `container-${capacity}`) changeSize(index + 1, capacity)
    }
    await confirm()
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith({ version: packingFixture.version, selection, containerTubeCounts: tubeCounts }))
    expect(screen.queryByLabelText(/reason/i)).toBeNull()
    expect(screen.queryByRole('spinbutton', { name: /Containers to use/ })).toBeNull()
  })

  it('offers only the five-tube size for three tubes and focuses the added row', async () => {
    showCount(3, [{ containerDefinitionId: 'container-5', quantity: 1 }])
    expect(offeredSizes(1)).toEqual([5])
    expect(tubes(1)).toHaveProperty('value', '3')
    expect(addButton()).toHaveProperty('disabled', true)
    remove(1)
    await add(1)
    expect(size(1)).toHaveProperty('value', 'container-5')
    expect(offeredSizes(1)).toEqual([5])
    expect(tubes(1)).toHaveProperty('value', '3')
  })

  it('narrows the second container to ten or five when eight of eighteen tubes still need capacity', async () => {
    showCount(18, [{ containerDefinitionId: 'container-20', quantity: 1 }])
    expect(offeredSizes(1)).toEqual([5, 10, 20])
    changeSize(1, 10)
    expect(tubes(1)).toHaveProperty('value', '10')
    expect(addButton()).toHaveProperty('disabled', false)
    await add(2)
    expect(size(2)).toHaveProperty('value', 'container-10')
    expect(offeredSizes(2)).toEqual([5, 10])
    expect(tubes(2)).toHaveProperty('value', '8')
    expect(addButton()).toHaveProperty('disabled', true)
    remove(2)
    expect(addButton()).toHaveProperty('disabled', false)
  })

  it('does not offer an oversized second container or add more capacity when tube counts are lowered', () => {
    show()
    expect(offeredSizes(2)).toEqual([5, 10])
    pack(1, 12)
    expect(addButton()).toHaveProperty('disabled', true)
    remove(2)
    expect(addButton()).toHaveProperty('disabled', false)
  })

  it('adds twenty then ten for an empty thirty-tube packing plan', async () => {
    showCount(30, [])
    await add(1)
    expect(size(1)).toHaveProperty('value', 'container-20')
    expect(tubes(1)).toHaveProperty('value', '20')
    await add(2)
    expect(size(2)).toHaveProperty('value', 'container-10')
    expect(tubes(2)).toHaveProperty('value', '10')
    expect(addButton()).toHaveProperty('disabled', true)
  })

  it('adds ten then five beside existing ten and five without invalidating any row', async () => {
    showCount(30, [{ containerDefinitionId: 'container-10', quantity: 1 }, { containerDefinitionId: 'container-5', quantity: 1 }])
    await add(3)
    expect(size(3)).toHaveProperty('value', 'container-10')
    expect(tubes(1)).toHaveProperty('value', '10')
    expect(tubes(2)).toHaveProperty('value', '5')
    expect(tubes(3)).toHaveProperty('value', '10')
    expect(offeredSizes(3)).toEqual([5, 10])
    for (const [index, capacity] of [10, 5, 10].entries()) {
      expect(size(index + 1)).toHaveProperty('value', `container-${capacity}`)
      expect(offeredSizes(index + 1)).toContain(capacity)
    }
    await add(4)
    expect(size(4)).toHaveProperty('value', 'container-5')
    expect(offeredSizes(4)).toEqual([5])
    for (const [index, capacity] of [10, 5, 10, 5].entries()) {
      expect(size(index + 1)).toHaveProperty('value', `container-${capacity}`)
      expect(offeredSizes(index + 1)).toContain(capacity)
      expect(tubes(index + 1)).toHaveProperty('value', String(capacity))
    }
    expect(addButton()).toHaveProperty('disabled', true)
    await confirm()
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith({ version: 3, selection: [{ containerDefinitionId: 'container-10', quantity: 2 }, { containerDefinitionId: 'container-5', quantity: 2 }], containerTubeCounts: [10, 10, 5, 5] }))
  })

  it('shows the exact shortfall and prepares only the allocated tubes after removing a container', async () => {
    show()
    remove(1)
    expect(size(1)).toHaveProperty('value', 'container-10')
    expect(tubes(1)).toHaveProperty('value', '10')
    expect(await screen.findByText(/20 tubes still need a container/)).toBeTruthy()
    const prepare = await screen.findByRole('button', { name: 'Prepare available containers' })
    await waitFor(() => expect(prepare).toHaveProperty('disabled', false))
    fireEvent.click(prepare)
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith({ version: 3, selection: [{ containerDefinitionId: 'container-10', quantity: 1 }], containerTubeCounts: [10] }))
  })

  it('blocks confirmation after a stock preview failure and allows a successful retry', async () => {
    mocks.preview.mockRejectedValueOnce(new Error('The selection exceeds the quantity available to you.'))
    show()
    expect(await screen.findByText(/selection exceeds the quantity available/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm containers' })).toHaveProperty('disabled', true)
    expect(screen.queryByText('Available quantities (optional)')).toBeNull()
    expect(screen.queryByRole('spinbutton', { name: /Available to you/ })).toBeNull()
    expect(mocks.confirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Retry preview' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm containers' })).toHaveProperty('disabled', false))
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('keeps allocation totals visible while recalculating and blocks stale confirmation', async () => {
    show()
    const summary = screen.getByRole('region', { name: 'Summary' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm containers' })).toHaveProperty('disabled', false))
    const totalLabels = ['Tubes', 'Containers', 'Usable capacity', 'Spare slots', 'Unallocated tubes']
    for (const label of totalLabels) expect(within(summary).getByText(label)).toBeTruthy()
    let resolvePreview!: (result: ContainerRecommendation) => void
    mocks.preview.mockImplementationOnce(() => new Promise<ContainerRecommendation>(resolve => { resolvePreview = resolve }))
    remove(2)
    expect(within(summary).getByText('Updating…')).toBeTruthy()
    for (const label of totalLabels) expect(within(summary).getByText(label)).toBeTruthy()
    expect(summary.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole('button', { name: 'Confirm containers' })).toHaveProperty('disabled', true)
    await waitFor(() => expect(resolvePreview).toBeTypeOf('function'))
    for (const label of totalLabels) expect(within(summary).getByText(label)).toBeTruthy()
    await act(async () => { resolvePreview(preview({ selection: [{ containerDefinitionId: 'container-20', quantity: 1 }] })) })
    await waitFor(() => expect(within(summary).queryByText('Updating…')).toBeNull())
    for (const label of totalLabels) expect(within(summary).getByText(label)).toBeTruthy()
    expect(within(summary).getByText(/10 tubes still need a container/)).toBeTruthy()
    expect(summary.getAttribute('aria-busy')).toBe('false')
    expect(screen.getByRole('button', { name: 'Prepare available containers' })).toHaveProperty('disabled', false)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('does not create shipments after all individual containers are removed', async () => {
    show()
    remove(2)
    remove(1)
    expect(screen.queryByRole('group', { name: /^Container \d+$/ })).toBeNull()
    expect(await screen.findByText('Choose at least one compatible container to prepare a shipment.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Prepare available containers' })).toHaveProperty('disabled', true)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('retains adjusted rows after a declined discard and exposes the server error with the draft', () => {
    const discard = vi.spyOn(window, 'confirm').mockReturnValue(false)
    show(false, new Error('The shipment changed. Review the current tube list.'))
    changeSize(1, 10)
    pack(1, 8)
    pack(2, 7)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(discard).toHaveBeenCalledWith('Discard the unsaved container selection?')
    expect(size(1)).toHaveProperty('value', 'container-10')
    expect(tubes(1)).toHaveProperty('value', '8')
    expect(tubes(2)).toHaveProperty('value', '7')
    expect(mocks.close).not.toHaveBeenCalled()
    expect(screen.getByText(/shipment changed/)).toBeTruthy()
  })

  it('blocks row edits, recommendation, removal, addition and dismissal while confirming', () => {
    show(true)
    expect(size(1)).toHaveProperty('disabled', true)
    expect(tubes(1)).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Remove container 1' })).toHaveProperty('disabled', true)
    expect(addButton()).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Use recommendation' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Keep reviewing' })).toHaveProperty('disabled', true)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(mocks.close).not.toHaveBeenCalled()
  })

  it('preserves unaffected allocations when adding, removing and changing a row', async () => {
    show()
    pack(1, 12)
    pack(2, 7)
    changeSize(1, 10)
    expect(tubes(1)).toHaveProperty('value', '10')
    expect(tubes(2)).toHaveProperty('value', '7')
    await add(3)
    expect(size(3)).toHaveProperty('value', 'container-10')
    expect(tubes(1)).toHaveProperty('value', '10')
    expect(tubes(2)).toHaveProperty('value', '7')
    expect(tubes(3)).toHaveProperty('value', '10')
    changeSize(3, 5)
    expect(tubes(1)).toHaveProperty('value', '10')
    expect(tubes(2)).toHaveProperty('value', '7')
    expect(tubes(3)).toHaveProperty('value', '5')
    remove(1)
    expect(tubes(1)).toHaveProperty('value', '7')
    expect(size(2)).toHaveProperty('value', 'container-5')
    expect(tubes(2)).toHaveProperty('value', '5')
    await add(3)
    expect(size(3)).toHaveProperty('value', 'container-10')
    expect(tubes(1)).toHaveProperty('value', '7')
    expect(tubes(2)).toHaveProperty('value', '5')
    expect(tubes(3)).toHaveProperty('value', '10')
  })

  it('groups interleaved types for confirmation without mixing their per-container counts', async () => {
    showCount(41, [{ containerDefinitionId: 'container-20', quantity: 2 }])
    changeSize(2, 5)
    pack(1, 19)
    await add(3)
    expect(size(1)).toHaveProperty('value', 'container-20')
    expect(size(2)).toHaveProperty('value', 'container-5')
    expect(size(3)).toHaveProperty('value', 'container-20')
    expect(tubes(3)).toHaveProperty('value', '17')
    await confirm()
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith({ version: 3, selection: [{ containerDefinitionId: 'container-20', quantity: 2 }, { containerDefinitionId: 'container-5', quantity: 1 }], containerTubeCounts: [19, 17, 5] }))
    expect(tubes(2)).toHaveProperty('value', '5')
  })

  it('replaces edited rows with a fresh recommendation without manual availability inputs', async () => {
    show()
    remove(2)
    changeSize(1, 5)
    fireEvent.click(screen.getByRole('button', { name: 'Use recommendation' }))
    await waitFor(() => expect(mocks.preview).toHaveBeenCalledWith(packingFixture.shipmentId, {}))
    await waitFor(() => expect(size(1)).toHaveProperty('value', 'container-20'))
    expect(size(2)).toHaveProperty('value', 'container-10')
    expect(tubes(1)).toHaveProperty('value', '20')
    expect(tubes(2)).toHaveProperty('value', '10')
    expect(screen.queryByRole('group', { name: 'Container 3' })).toBeNull()
    expect(screen.queryByText('Available quantities (optional)')).toBeNull()
    expect(screen.queryByRole('spinbutton', { name: /Available to you/ })).toBeNull()
  })

  it('blocks overfilled containers and a tube allocation with the wrong total', async () => {
    show()
    pack(1, 21)
    await confirm()
    expect(await screen.findByText('This container holds at most 20 tubes.')).toBeTruthy()
    pack(1, 19)
    await confirm()
    expect(await screen.findByText(/Assign exactly 30 tubes across these containers/)).toBeTruthy()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it.each([{ count: -1, error: 'Enter zero or more tubes.' }, { count: 1.5, error: 'Enter a whole number of tubes.' }])('rejects invalid tube count $count without confirming a shipment', async ({ count, error }) => {
    show()
    pack(1, count)
    await confirm()
    expect(await screen.findByText(error)).toBeTruthy()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('preserves typed rows and the original concurrency version through background refresh', async () => {
    const { refresh } = showCount(41, [{ containerDefinitionId: 'container-20', quantity: 2 }])
    changeSize(2, 5)
    await add(3)
    pack(1, 18)
    pack(2, 4)
    pack(3, 19)
    refresh()
    expect(size(2)).toHaveProperty('value', 'container-5')
    expect(tubes(1)).toHaveProperty('value', '18')
    expect(tubes(2)).toHaveProperty('value', '4')
    expect(tubes(3)).toHaveProperty('value', '19')
    await confirm()
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ version: 3, containerTubeCounts: [18, 19, 4] })))
  })
})
