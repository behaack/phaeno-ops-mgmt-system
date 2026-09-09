import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomerDeliveryLocation } from '#/api/customer-delivery-locations'
import type { ShipmentKitSupply, TransportationKitRequest } from '#/api/transportation-kit-requests'
import { packingRecommendation, shippingFixture } from '#/test-helpers/sample-shipping'
import { KitReceiptDialog, TransportationKitOrderDialog, TransportationKitsPanel } from './TransportationKitsPanel'

const mocks = vi.hoisted(() => ({ supply: vi.fn(), order: vi.fn(), receive: vi.fn(), cancel: vi.fn(), confirm: vi.fn(), close: vi.fn() }))
vi.mock('#/api/transportation-kit-requests', () => ({ getShipmentKitSupply: mocks.supply, orderTransportationKits: mocks.order, confirmTransportationKitsReceived: mocks.receive, cancelTransportationKitRequest: mocks.cancel }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ selectedDepartmentId: 'department-1' }) }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), Link: ({ children }: { children: ReactNode }) => <a href="#locations">{children}</a> }))
const location: CustomerDeliveryLocation = { id: 'location-1', organizationId: 'org-1', departmentId: 'department-1', label: 'Receiving laboratory', recipient: 'Lab receiving', line1: '100 Example Road', line2: null, city: 'Example', region: 'CA', postalCode: '90000', countryCode: 'US', phone: null, deliveryInstructions: 'Room 10', isDefault: true, isActive: true, version: 2 }
const request: TransportationKitRequest = { id: 'request-1', jobId: 'order-1', jobNumber: 'JOB-1', organizationId: 'org-1', organizationName: 'Customer', departmentId: 'department-1', departmentName: 'General', deliveryLocationId: location.id, deliveryAddress: location, status: 'Pending', requestedAt: '2026-09-08T12:00:00Z', version: 1, includedInLabOrder: true, lines: packingRecommendation.containers.map(item => ({ id: item.containerDefinitionId, containerDefinitionId: item.containerDefinitionId, sku: item.sku, commonName: item.commonName, tubeCapacity: item.capacity, requestedQuantity: item.quantity, dispatchedQuantity: 0, receivedQuantity: 0 })), kits: [], canConfirmReceipt: false, canCancel: true, cancellationReason: null }
const supply: ShipmentKitSupply = { shipmentId: shippingFixture.id, shipmentVersion: 3, jobId: 'order-1', jobNumber: 'JOB-1', tubeCount: 30, deliveryLocationId: location.id, locations: [location], recommendation: packingRecommendation, recordedStock: [], inventoryStatus: 'Unknown', request: null, canRequestKits: true, requestBlockedReason: null, canPrepareSamples: true, preparationBlockedReason: null }
const dispatched: TransportationKitRequest = { ...request, status: 'Dispatched', version: 2, canConfirmReceipt: true, canCancel: false, kits: [1, 2].map(index => ({ stockKitId: `stock-${index}`, kitNumber: `KIT-${index}`, requestLineId: request.lines[index - 1].id, containerDefinitionId: request.lines[index - 1].containerDefinitionId, outboundCarrier: 'Example carrier', outboundTrackingNumber: `TRACK-${index}`, dispatchedAt: '2026-09-09T12:00:00Z', receivedAt: null })) }
beforeEach(() => { vi.clearAllMocks(); mocks.supply.mockResolvedValue(supply); mocks.order.mockResolvedValue(request) })
afterEach(() => vi.restoreAllMocks())
function provider(children: ReactNode) { return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{children}</QueryClientProvider> }
function panel(canManage = true) { return render(provider(<TransportationKitsPanel shipment={{ ...shippingFixture, isPackingPool: true }} canManage={canManage}><p>Sample preparation controls</p></TransportationKitsPanel>)) }
function dialog(initial = supply, busy = false, error: unknown = null) { return render(provider(<TransportationKitOrderDialog shipmentId={shippingFixture.id} organizationId="org-1" departmentId="department-1" initial={initial} busy={busy} error={error} onClose={mocks.close} onConfirm={mocks.confirm} />)) }

describe('customer transportation kits', () => {
  it('offers ordering for unknown inventory without claiming a verified zero balance, and preserves the explicit existing-kit path', async () => {
    panel()
    expect(await screen.findByRole('button', { name: 'Order transportation kits' })).toBeTruthy()
    expect(screen.getByText(/do not have a confirmed kit balance/)).toBeTruthy()
    expect(screen.queryByText(/No usable registered kits/)).toBeNull()
    expect(screen.queryByText('Sample preparation controls')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'I already have kits' }))
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

  it.each(['Pending', 'Dispatched'] as const)('uses server authority to block preparation and duplicate ordering for %s kits', async status => {
    mocks.supply.mockResolvedValue({ ...supply, request: status === 'Pending' ? request : dispatched, canRequestKits: false, canPrepareSamples: false, preparationBlockedReason: 'Confirm kit receipt before preparing samples.' })
    panel()
    await screen.findByText(status === 'Pending' ? 'Kits ordered' : 'Kits on the way')
    expect(screen.queryByRole('button', { name: 'Order transportation kits' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'I already have kits' })).toBeNull()
    expect(screen.queryByText('Sample preparation controls')).toBeNull()
    if (status === 'Dispatched') expect(screen.getByText(/Tracking TRACK-1/)).toBeTruthy()
  })

  it('allows the acknowledged available portion while remaining dispatched kits stay on the way', async () => {
    const partial = { ...dispatched, kits: dispatched.kits.map((kit, index) => index ? kit : { ...kit, receivedAt: '2026-09-10T12:00:00Z' }) }
    mocks.supply.mockResolvedValue({ ...supply, request: partial, canRequestKits: false, inventoryStatus: 'RecordedForThisJob', recordedStock: [{ containerDefinitionId: 'container-20', availableQuantity: 1, inTransitQuantity: 1 }], canPrepareSamples: true })
    panel()
    fireEvent.click(await screen.findByRole('button', { name: 'Prepare samples' }))
    expect(screen.getByText('Sample preparation controls')).toBeTruthy()
    expect(screen.getByText('KIT-1 · Received')).toBeTruthy()
    expect(screen.getByText('KIT-2 · On the way')).toBeTruthy()
  })

  it('allows a new server-authorized order for residual tubes after an earlier request was received, then suppresses another duplicate', async () => {
    const received: TransportationKitRequest = { ...dispatched, status: 'Received', canConfirmReceipt: false, lines: [{ ...request.lines[0], dispatchedQuantity: 1, receivedQuantity: 1 }], kits: [{ ...dispatched.kits[0], receivedAt: '2026-09-10T12:00:00Z' }] }
    mocks.supply.mockResolvedValue({ ...supply, request: received, inventoryStatus: 'RecordedForThisJob', recordedStock: [{ containerDefinitionId: 'container-20', availableQuantity: 0, inTransitQuantity: 0 }], canRequestKits: true })
    panel()
    expect(await screen.findByText('Kits received')).toBeTruthy()
    expect(screen.getByText('KIT-1 · Received')).toBeTruthy()
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
})
