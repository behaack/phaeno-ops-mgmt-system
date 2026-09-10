import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomerDeliveryLocation } from '#/api/customer-delivery-locations'
import type { ShipmentKitSupply, TransportationKitRequest } from '#/api/transportation-kit-requests'
import { packingRecommendation, shippingContainers, shippingFixture, shippingTube } from '#/test-helpers/sample-shipping'
import { KitReceiptDialog, TransportationKitOrderDialog, TransportationKitsPanel } from './TransportationKitsPanel'

const mocks = vi.hoisted(() => ({ supply: vi.fn(), order: vi.fn(), receive: vi.fn(), cancel: vi.fn(), confirm: vi.fn(), close: vi.fn() }))
vi.mock('#/api/transportation-kit-requests', () => ({ getShipmentKitSupply: mocks.supply, orderTransportationKits: mocks.order, confirmTransportationKitsReceived: mocks.receive, cancelTransportationKitRequest: mocks.cancel }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ selectedDepartmentId: 'department-1' }) }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), Link: ({ children, search }: { children: ReactNode; search?: Record<string, unknown> }) => <a href="#locations" data-search={JSON.stringify(search)}>{children}</a> }))
const location: CustomerDeliveryLocation = { id: 'location-1', organizationId: 'org-1', departmentId: 'department-1', label: 'Receiving laboratory', recipient: 'Lab receiving', line1: '100 Example Road', line2: null, city: 'Example', region: 'CA', postalCode: '90000', countryCode: 'US', phone: null, deliveryInstructions: 'Room 10', isDefault: true, isActive: true, version: 2 }
const request: TransportationKitRequest = { id: 'request-1', jobId: 'order-1', jobNumber: 'JOB-1', organizationId: 'org-1', organizationName: 'Customer', departmentId: 'department-1', departmentName: 'General', deliveryLocationId: location.id, deliveryAddress: location, status: 'Pending', requestedAt: '2026-09-08T12:00:00Z', version: 1, includedInLabOrder: true, lines: packingRecommendation.containers.map(item => ({ id: item.containerDefinitionId, containerDefinitionId: item.containerDefinitionId, sku: item.sku, commonName: item.commonName, tubeCapacity: item.capacity, requestedQuantity: item.quantity, dispatchedQuantity: 0, receivedQuantity: 0 })), kits: [], canConfirmReceipt: false, canCancel: true, cancellationReason: null }
const supply: ShipmentKitSupply = { shipmentId: shippingFixture.id, shipmentVersion: 3, jobId: 'order-1', jobNumber: 'JOB-1', tubeCount: 30, deliveryLocationId: location.id, locations: [location], recommendation: packingRecommendation, recordedStock: [], inventoryStatus: 'Unknown', request: null, canRequestKits: true, requestBlockedReason: null, canPrepareSamples: false, preparationBlockedReason: 'Order transportation kits for this Job, then confirm their arrival before configuring containers or scanning tubes.' }
const dispatched: TransportationKitRequest = { ...request, status: 'Dispatched', version: 2, canConfirmReceipt: true, canCancel: false, kits: [1, 2].map(index => ({ stockKitId: `stock-${index}`, kitNumber: `KIT-${index}`, requestLineId: request.lines[index - 1].id, containerDefinitionId: request.lines[index - 1].containerDefinitionId, outboundCarrier: 'Example carrier', outboundTrackingNumber: `TRACK-${index}`, dispatchedAt: '2026-09-09T12:00:00Z', receivedAt: null })) }
beforeEach(() => { vi.clearAllMocks(); mocks.supply.mockResolvedValue(supply); mocks.order.mockResolvedValue(request) })
afterEach(() => vi.restoreAllMocks())
function provider(children: ReactNode) { return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{children}</QueryClientProvider> }
function panel(canManage = true, isPackingPool = true) { return render(provider(<TransportationKitsPanel shipment={{ ...shippingFixture, isPackingPool }} canManage={canManage}><p>Sample preparation controls</p></TransportationKitsPanel>)) }
function dialog(initial = supply, busy = false, error: unknown = null) { return render(provider(<TransportationKitOrderDialog shipmentId={shippingFixture.id} organizationId="org-1" departmentId="department-1" initial={initial} busy={busy} error={error} onClose={mocks.close} onConfirm={mocks.confirm} />)) }

describe('customer transportation kits', () => {
  it('keeps delivery-location setup reachable when an order intent cannot yet open its dialog', async () => {
    const active = vi.fn()
    mocks.supply.mockResolvedValue({ ...supply, locations: [], deliveryLocationId: null })
    render(provider(<TransportationKitsPanel shipment={{ ...shippingFixture, isPackingPool: true }} canManage autoOpenOrder onActivityChange={active} />))
    expect(await screen.findByRole('link', { name: 'Add a delivery location' })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(active).toHaveBeenLastCalledWith(false)
  })
  it('retains the owning Job and selected shipment through kit-order delivery-location setup', () => {
    render(provider(<TransportationKitOrderDialog shipmentId={shippingFixture.id} organizationId="org-1" departmentId="department-1" returnOrderId="order-1" initial={supply} busy={false} error={null} onClose={mocks.close} onConfirm={mocks.confirm} />))
    expect(JSON.parse(screen.getByRole('link', { name: 'Manage delivery locations' }).getAttribute('data-search')!)).toEqual({ organizationId: 'org-1', departmentId: 'department-1', shipmentId: shippingFixture.id, returnOrderId: 'order-1' })
    expect(mocks.order).not.toHaveBeenCalled()
  })
  it('offers optional compatible kit sizes and preserves draft quantities when returning to the recommendation', async () => {
    const customSupply = { ...supply, containerTypes: shippingContainers }
    mocks.supply.mockResolvedValue(customSupply)
    dialog(customSupply)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm kit order' })).toHaveProperty('disabled', false))
    fireEvent.click(screen.getByRole('button', { name: 'Adjust kit sizes' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity of 20-tube container' }), { target: { value: '0' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity of 10-tube container' }), { target: { value: '0' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity of 5-tube container' }), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm kit order' }))
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ containers: [{ containerDefinitionId: 'container-5', quantity: 6 }] })))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity of 5-tube container' }), { target: { value: '-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use recommended sizes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm kit order' }))
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(2))
    expect(mocks.confirm.mock.calls[1][0].containers).toEqual([{ containerDefinitionId: 'container-20', quantity: 1 }, { containerDefinitionId: 'container-10', quantity: 1 }])
    fireEvent.click(screen.getByRole('button', { name: 'Adjust kit sizes' }))
    expect(screen.getByRole('spinbutton', { name: 'Quantity of 5-tube container' })).toHaveProperty('value', '-1')
  })
  it('keeps cancelled ordering separate from received stock and exposes the direct-link order path', async () => {
    mocks.supply.mockResolvedValue({ ...supply, request: { ...request, status: 'Cancelled' }, canPrepareSamples: true })
    panel(true, false)
    expect(await screen.findByText('Kit order cancelled.')).toBeTruthy()
    expect(screen.getByText('Sample preparation controls')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Order transportation kits' }))
    expect(screen.getByRole('dialog', { name: 'Order transportation kits' })).toBeTruthy()
    expect(mocks.order).not.toHaveBeenCalled()
  })

  it('retains acknowledged older Job supply when a later replenishment order is cancelled', async () => {
    mocks.supply.mockResolvedValue({ ...supply, request: { ...request, status: 'Cancelled' }, canPrepareSamples: true, recordedStock: [{ containerDefinitionId: 'container-20', availableQuantity: 1, inTransitQuantity: 0 }] })
    panel()
    expect(await screen.findByText('Sample preparation controls')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'I already have kits' })).toBeNull()
  })

  it('preserves already-bound historical kit scanning when the server permits it', async () => {
    mocks.supply.mockResolvedValue({ ...supply, canPrepareSamples: true })
    render(provider(<TransportationKitsPanel shipment={{ ...shippingFixture, returnKit: { id: 'legacy-kit' } as NonNullable<typeof shippingFixture.returnKit> }} canManage><p>Sample preparation controls</p></TransportationKitsPanel>))
    expect(await screen.findByText('Sample preparation controls')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Order transportation kits' })).toBeNull()
  })

  it('retains read-only preparation while server preparation is blocked', async () => {
    mocks.supply.mockResolvedValue({ ...supply, recordedStock: [{ containerDefinitionId: 'container-20', availableQuantity: 1, inTransitQuantity: 0 }] })
    panel()
    await screen.findByRole('button', { name: 'Order transportation kits' })
    expect(screen.getByText('Sample preparation controls')).toBeTruthy()
  })

  it('offers ordering for unrecorded inventory without unmounting the preparation view', async () => {
    mocks.supply.mockResolvedValue({ ...supply, canPrepareSamples: true })
    panel()
    expect(await screen.findByRole('button', { name: 'Order transportation kits' })).toBeTruthy()
    expect(screen.getByText(/No compatible received kits are currently available at this location/)).toBeTruthy()
    expect(screen.queryByText(/No usable registered kits/)).toBeNull()
    expect(screen.getByText('Sample preparation controls')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'I already have kits' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Prepare samples' })).toBeNull()
  })

  it.each(['Unknown', 'RecordedForThisJob'] as const)('offers ordering and preserves the view for an unbound eighteen-tube deep link when inventory is %s', async inventoryStatus => {
    mocks.supply.mockResolvedValue({ ...supply, tubeCount: 18, inventoryStatus, recordedStock: [], canPrepareSamples: true })
    render(provider(<TransportationKitsPanel shipment={{ ...shippingFixture, crosswalk: Array.from({ length: 18 }, (_, index) => shippingTube(index + 1)) }} canManage autoOpenOrder><p>Sample preparation controls</p></TransportationKitsPanel>))
    expect(await screen.findByRole('dialog', { name: 'Order transportation kits' })).toBeTruthy()
    expect(screen.getByText('Sample preparation controls')).toBeTruthy()
    expect(screen.queryAllByText('Transportation kits').filter(element => !element.closest('[role="dialog"]'))).toHaveLength(0)
    expect(screen.getByText('Kit delivery')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keep reviewing' }))
    expect(screen.getByRole('button', { name: 'Order transportation kits' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'I already have kits' })).toBeNull()
    expect(mocks.order).not.toHaveBeenCalled()
  })

  it('keeps a received request out of the selected-container screen even when more kits can be ordered for residual tubes', async () => {
    const received: TransportationKitRequest = { ...dispatched, status: 'Received', canConfirmReceipt: false, kits: dispatched.kits.map(kit => ({ ...kit, receivedAt: '2026-09-10T12:00:00Z' })) }
    mocks.supply.mockResolvedValue({ ...supply, request: received, canRequestKits: true, canPrepareSamples: true, recordedStock: [{ containerDefinitionId: 'container-20', availableQuantity: 1, inTransitQuantity: 0 }] })
    panel(true, false)
    expect(await screen.findByText('Sample preparation controls')).toBeTruthy()
    expect(screen.queryByText('Kits received')).toBeNull()
    expect(screen.queryByText('Transportation kits')).toBeNull()
    await waitFor(() => expect(screen.queryByText('Kit delivery')).toBeNull())
    expect(screen.queryByRole('button', { name: 'Order transportation kits' })).toBeNull()
  })

  it.each(['Pending', 'PartiallyDispatched', 'Dispatched'] as const)('retains %s delivery status and server preparation gates for a selected container', async status => {
    const current = status === 'Pending' ? request : { ...dispatched, status }
    mocks.supply.mockResolvedValue({ ...supply, request: current, canRequestKits: true, canPrepareSamples: false, preparationBlockedReason: 'Confirm kit receipt before preparing samples.' })
    panel(true, false)
    const expectedStatus = status === 'Pending' ? 'Kits ordered' : status === 'PartiallyDispatched' ? 'Some kits are on the way' : 'Kits on the way'
    expect(await screen.findByText(expectedStatus)).toBeTruthy()
    expect(screen.getByText('Kit delivery')).toBeTruthy()
    expect(screen.getByText('Confirm kit receipt before preparing samples.')).toBeTruthy()
    expect(screen.getByText('Sample preparation controls')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Order transportation kits' })).toBeNull()
    if (status !== 'Pending') {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm kits received' }))
      expect(screen.getByRole('dialog', { name: 'Confirm kits received' })).toBeTruthy()
      expect(screen.getByRole('checkbox', { name: /KIT-1/ })).toBeTruthy()
      expect(mocks.receive).not.toHaveBeenCalled()
    }
  })

  it('shows only outstanding delivery and receipt actions beside allowed scanning without another order path', async () => {
    const partial: TransportationKitRequest = { ...dispatched, status: 'PartiallyDispatched', kits: dispatched.kits.map((kit, index) => index ? kit : { ...kit, receivedAt: '2026-09-10T12:00:00Z' }) }
    mocks.supply.mockResolvedValue({ ...supply, request: partial, canRequestKits: true, canPrepareSamples: true, recordedStock: [{ containerDefinitionId: 'container-20', availableQuantity: 1, inTransitQuantity: 0 }] })
    panel(true, false)
    expect(await screen.findByText('Sample preparation controls')).toBeTruthy()
    expect(await screen.findByText('Some kits are on the way')).toBeTruthy()
    expect(screen.getByText('KIT-2 · On the way')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm kits received' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Order transportation kits' })).toBeNull()
    expect(screen.queryByText(/Our records indicate you have no transportation kits/)).toBeNull()
  })

  it('retains the selected-container view when kit information cannot be checked', async () => {
    mocks.supply.mockRejectedValueOnce(new Error('Kit records could not be reached.'))
    panel(true, false)
    expect(await screen.findByText('Kit information unavailable')).toBeTruthy()
    expect(screen.getByText('Sample preparation controls')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Order transportation kits' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry kit information' }))
    expect(await screen.findByRole('button', { name: 'Order transportation kits' })).toBeTruthy()
    expect(screen.getByText('Sample preparation controls')).toBeTruthy()
  })

  it('prefills recommended quantities and the default location, retains the idempotency key on retry, then shows durable ordered status', async () => {
    mocks.order.mockRejectedValueOnce(new Error('Connection interrupted. Retry this order.'))
    panel()
    fireEvent.click(await screen.findByRole('button', { name: 'Order transportation kits' }))
    const modal = screen.getByRole('dialog', { name: 'Order transportation kits' })
    expect(within(modal).getByRole('combobox', { name: /Delivery location/ })).toHaveProperty('value', location.id)
    expect(within(modal).getByText(/no additional charge/)).toBeTruthy()
    const submit = within(modal).getByRole('button', { name: 'Confirm kit order' })
    await waitFor(() => expect(submit).toHaveProperty('disabled', false))
    fireEvent.click(submit)
    expect(await within(modal).findByText(/Connection interrupted/)).toBeTruthy()
    const firstKey = mocks.order.mock.calls[0][2]
    mocks.supply.mockResolvedValue({ ...supply, request, canRequestKits: false, canPrepareSamples: false })
    fireEvent.click(submit)
    expect(await screen.findByText('Kits ordered')).toBeTruthy()
    expect(mocks.order).toHaveBeenLastCalledWith(shippingFixture.id, { shipmentVersion: 3, deliveryLocationId: location.id, deliveryLocationVersion: 2, containers: [{ containerDefinitionId: 'container-20', quantity: 1 }, { containerDefinitionId: 'container-10', quantity: 1 }] }, firstKey)
    expect(screen.queryByRole('button', { name: 'Order transportation kits' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'I already have kits' })).toBeNull()
  })

  it.each(['Pending', 'Dispatched'] as const)('explains server preparation gates and suppresses duplicate ordering for %s kits', async status => {
    mocks.supply.mockResolvedValue({ ...supply, request: status === 'Pending' ? request : dispatched, canRequestKits: false, canPrepareSamples: false, preparationBlockedReason: 'Confirm kit receipt before preparing samples.' })
    panel()
    await screen.findByText(status === 'Pending' ? 'Kits ordered' : 'Kits on the way')
    expect(screen.queryByRole('button', { name: 'Order transportation kits' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'I already have kits' })).toBeNull()
    expect(screen.getByText('Sample preparation controls')).toBeTruthy()
    if (status === 'Dispatched') expect(screen.getByText(/Tracking TRACK-1/)).toBeTruthy()
  })

  it('allows the acknowledged available portion while remaining dispatched kits stay on the way', async () => {
    const partial = { ...dispatched, kits: dispatched.kits.map((kit, index) => index ? kit : { ...kit, receivedAt: '2026-09-10T12:00:00Z' }) }
    mocks.supply.mockResolvedValue({ ...supply, request: partial, canRequestKits: false, inventoryStatus: 'RecordedForThisJob', recordedStock: [{ containerDefinitionId: 'container-20', availableQuantity: 1, inTransitQuantity: 1 }], canPrepareSamples: true })
    panel()
    expect(await screen.findByText('Sample preparation controls')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Prepare samples' })).toBeNull()
    expect(await screen.findByText('KIT-1 · Received')).toBeTruthy()
    expect(screen.getByText('KIT-2 · On the way')).toBeTruthy()
  })

  it('allows a new server-authorized order for residual tubes after an earlier request was received, then suppresses another duplicate', async () => {
    const received: TransportationKitRequest = { ...dispatched, status: 'Received', canConfirmReceipt: false, lines: [{ ...request.lines[0], dispatchedQuantity: 1, receivedQuantity: 1 }], kits: [{ ...dispatched.kits[0], receivedAt: '2026-09-10T12:00:00Z' }] }
    mocks.supply.mockResolvedValue({ ...supply, request: received, inventoryStatus: 'RecordedForThisJob', recordedStock: [{ containerDefinitionId: 'container-20', availableQuantity: 0, inTransitQuantity: 0 }], canRequestKits: true })
    panel()
    expect(await screen.findByText('Kits received')).toBeTruthy()
    expect(await screen.findByText('KIT-1 · Received')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Order transportation kits' }))
    const modal = screen.getByRole('dialog', { name: 'Order transportation kits' })
    const submit = within(modal).getByRole('button', { name: 'Confirm kit order' })
    await waitFor(() => expect(submit).toHaveProperty('disabled', false))
    const nextRequest = { ...request, id: 'request-2' }
    mocks.order.mockResolvedValue(nextRequest)
    mocks.supply.mockResolvedValue({ ...supply, request: nextRequest, canRequestKits: false, canPrepareSamples: false })
    fireEvent.click(submit)
    expect(await screen.findByText('Kits ordered')).toBeTruthy()
    expect(mocks.order).toHaveBeenCalledExactlyOnceWith(shippingFixture.id, { shipmentVersion: 3, deliveryLocationId: location.id, deliveryLocationVersion: 2, containers: [{ containerDefinitionId: 'container-20', quantity: 1 }, { containerDefinitionId: 'container-10', quantity: 1 }] }, expect.any(String))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Order transportation kits' })).toBeNull()
  })

  it('gives Members a read-only explanation', async () => {
    panel(false)
    expect(await screen.findByText(/administrator can order transportation kits/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Order transportation kits' })).toBeNull()
  })

  it('blocks a missing location and provides its management link', async () => {
    const missing = { ...supply, locations: [], deliveryLocationId: null, canRequestKits: false }
    mocks.supply.mockResolvedValue(missing)
    dialog(missing)
    expect(screen.getByRole('link', { name: 'Manage delivery locations' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm kit order' })).toHaveProperty('disabled', true)
    expect(screen.getByText('Add a delivery location before ordering kits.')).toBeTruthy()
  })

  it('opens a chooser for multiple locations with no default instead of disabling the order path', async () => {
    const alternate = { ...location, id: 'location-2', label: 'Second laboratory', isDefault: false }
    const multiple = { ...supply, deliveryLocationId: null, locations: [{ ...location, isDefault: false }, alternate] }
    mocks.supply.mockImplementation(async (_id, selected) => ({ ...multiple, deliveryLocationId: selected ?? null }))
    panel()
    fireEvent.click(await screen.findByRole('button', { name: 'Order transportation kits' }))
    const modal = screen.getByRole('dialog')
    const submit = within(modal).getByRole('button', { name: 'Confirm kit order' })
    expect(submit).toHaveProperty('disabled', false)
    fireEvent.click(submit)
    expect(await within(modal).findByText('Select a delivery location.')).toBeTruthy()
    expect(document.activeElement).toBe(within(modal).getByRole('combobox', { name: /Delivery location/ }))
    fireEvent.change(within(modal).getByRole('combobox', { name: /Delivery location/ }), { target: { value: alternate.id } })
    await waitFor(() => expect(submit).toHaveProperty('disabled', false))
  })

  it('reopens confirmation after delivery-location setup without ordering automatically', async () => {
    render(provider(<TransportationKitsPanel shipment={{ ...shippingFixture, isPackingPool: true }} canManage autoOpenOrder />))
    expect(await screen.findByRole('dialog', { name: 'Order transportation kits' })).toBeTruthy()
    expect(mocks.order).not.toHaveBeenCalled()
  })

  it('offers delivery-location setup before opening an order when the customer has none', async () => {
    mocks.supply.mockResolvedValue({ ...supply, locations: [], deliveryLocationId: null, canRequestKits: false, requestBlockedReason: 'Add a delivery location first.' })
    panel()
    expect(await screen.findByRole('link', { name: 'Add a delivery location' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Order transportation kits' })).toHaveProperty('disabled', true)
  })

  it('refreshes the recommendation and submits the selected location version instead of the former default', async () => {
    const alternate = { ...location, id: 'location-2', label: 'Second laboratory', isDefault: false, version: 7 }
    const initial = { ...supply, locations: [location, alternate] }
    mocks.supply.mockImplementation(async (_id, selected) => ({ ...initial, deliveryLocationId: selected ?? initial.deliveryLocationId }))
    dialog(initial)
    fireEvent.change(screen.getByRole('combobox', { name: /Delivery location/ }), { target: { value: alternate.id } })
    const submit = screen.getByRole('button', { name: 'Confirm kit order' })
    await waitFor(() => expect(submit).toHaveProperty('disabled', false))
    fireEvent.click(submit)
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ deliveryLocationId: alternate.id, deliveryLocationVersion: 7 })))
  })

  it('acknowledges only selected physically arrived kits, retaining the selection after error and declined discard', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(provider(<KitReceiptDialog request={dispatched} busy={false} error={new Error('Receipt could not be recorded.')} onClose={mocks.close} onConfirm={mocks.confirm} />))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm received kits' }))
    expect(await screen.findByText('Select the kits that have arrived.')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: /KIT-2/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mocks.close).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox', { name: /KIT-2/ })).toHaveProperty('checked', true)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm received kits' }))
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(['stock-2']))
    expect(screen.getByRole('checkbox', { name: /KIT-1/ })).toHaveProperty('checked', false)
  })

  it('blocks submission and dismissal while ordering', async () => {
    dialog(supply, true)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Keep reviewing' }))
    expect(mocks.close).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Ordering kits…' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('combobox', { name: /Delivery location/ }).closest('fieldset')).toHaveProperty('disabled', true)
  })

  it.each([
    { error: new Error('An unexpected error occurred.'), message: 'We couldn’t place your kit order. Your selections are still here. Please try again.' },
    { error: new Error('Request failed with status code 500'), message: 'We couldn’t place your kit order. Your selections are still here. Please try again.' },
    { error: new Error('The delivery location changed. Review the current address before ordering.'), message: 'The delivery location changed. Review the current address before ordering.' },
  ])('provides useful order feedback while preserving the selected location: $message', async ({ error, message }) => {
    dialog(supply, false, error)
    const feedback = screen.getByRole('alert')
    expect(within(feedback).getByText(message)).toBeTruthy()
    expect(screen.getByRole('combobox', { name: /Delivery location/ })).toHaveProperty('value', location.id)
    expect(screen.getByText(location.line1)).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm kit order' })).toHaveProperty('disabled', false))
    expect(mocks.confirm).not.toHaveBeenCalled()
  })
})
