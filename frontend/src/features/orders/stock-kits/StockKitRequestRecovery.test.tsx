import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShippingStockKit } from '#/api/shipping-containers'
import type { TransportationKitRequest } from '#/api/transportation-kit-requests'
import { shippingFixture } from '#/test-helpers/sample-shipping'
import { standardKit } from '#/test-helpers/shipping-containers'
import { kitRequestFixture } from '#/test-helpers/transportation-kit-requests'
import { StockKitRequestRecovery, UpdateKitRequestDialog } from './StockKitRequestRecovery'
import { matchingUnlinkedKitRequest, refreshStockKitSupply } from './stock-kit-request-sync'

const mocks = vi.hoisted(() => ({ requests: vi.fn(), shipments: vi.fn(), dispatch: vi.fn() }))
vi.mock('#/api/transportation-kit-requests', () => ({ getPlatformTransportationKitRequests: mocks.requests }))
vi.mock('#/api/sample-shipping', () => ({ getSourceSampleShipments: mocks.shipments }))
vi.mock('#/api/shipping-containers', () => ({ dispatchShippingStockKit: mocks.dispatch }))
vi.mock('../use-order-draft-guard', () => ({ useOrderDraftGuard: () => vi.fn() }))

const request: TransportationKitRequest = { ...kitRequestFixture, lines: kitRequestFixture.lines.map(line => ({ ...line, containerDefinitionId: standardKit.container.definitionId, requestedQuantity: 1 })) }
const kit: ShippingStockKit = { ...standardKit, status: 'Fulfilled', authorizationSourceId: request.jobId, organizationId: request.organizationId, authorizationReference: request.jobNumber, outboundCarrier: 'Original carrier', outboundTrackingNumber: 'SAVED-TRACKING', fulfilledAt: '2026-09-08T20:14:15.123456Z', version: 7 }
const shipment = { ...shippingFixture, authorizationSourceId: request.jobId, organizationId: request.organizationId }
const linked: TransportationKitRequest = { ...request, status: 'Dispatched', kits: [{ stockKitId: kit.id, kitNumber: kit.kitNumber, requestLineId: request.lines[0].id, containerDefinitionId: kit.container.definitionId, outboundCarrier: kit.outboundCarrier!, outboundTrackingNumber: kit.outboundTrackingNumber!, dispatchedAt: kit.fulfilledAt!, receivedAt: null }] }
function mount(node: ReactNode, client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) { return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>) }
beforeEach(() => { vi.clearAllMocks(); mocks.requests.mockResolvedValue([request]); mocks.shipments.mockResolvedValue([shipment]); mocks.dispatch.mockResolvedValue(kit) })

describe('recorded kit dispatch reconciliation', () => {
  it.each([
    ['another Job', { ...request, jobId: 'another-job' }],
    ['another organization', { ...request, organizationId: 'another-organization' }],
    ['another container revision', { ...request, lines: request.lines.map(line => ({ ...line, containerDefinitionId: 'another-size' })) }],
    ['filled quantity', { ...request, lines: request.lines.map(line => ({ ...line, dispatchedQuantity: line.requestedQuantity })) }],
    ['cancelled request', { ...request, status: 'Cancelled' as const }],
    ['already linked kit', linked],
  ])('does not offer recovery for %s', async (_name, candidate) => {
    mocks.requests.mockResolvedValue([candidate]); mount(<StockKitRequestRecovery kit={kit} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('Checking the kit request…')).toBeNull())
    expect(screen.queryByRole('button', { name: 'Update kit request' })).toBeNull()
    expect(mocks.shipments).not.toHaveBeenCalled(); expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it('rejects ambiguous requests, bound kits and missing saved dispatch facts', () => {
    expect(matchingUnlinkedKitRequest(kit, [request])).toBe(request)
    expect(matchingUnlinkedKitRequest(kit, [request, { ...request, id: 'duplicate' }])).toBeNull()
    expect(matchingUnlinkedKitRequest({ ...kit, boundSampleShipmentId: shipment.id }, [request])).toBeNull()
    expect(matchingUnlinkedKitRequest({ ...kit, status: 'Preparing' }, [request])).toBeNull()
    expect(matchingUnlinkedKitRequest({ ...kit, fulfilledAt: null }, [request])).toBeNull()
    expect(matchingUnlinkedKitRequest({ ...kit, outboundTrackingNumber: null }, [request])).toBeNull()
  })

  it('confirms the existing dispatch exactly and refreshes both queues, supply and Job data', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }), invalidate = vi.spyOn(client, 'invalidateQueries')
    mocks.dispatch.mockImplementation(async () => { mocks.requests.mockResolvedValue([linked]); return kit })
    mount(<StockKitRequestRecovery kit={kit} onSaved={() => refreshStockKitSupply(client)} />, client)
    fireEvent.click(await screen.findByRole('button', { name: 'Update kit request' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('SAVED-TRACKING')).toBeTruthy()
    expect(within(dialog).getByText(/does not send another kit or confirm Customer receipt/)).toBeTruthy()
    expect(mocks.dispatch).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update kit request' }))
    await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledWith(kit.id, { shipmentId: shipment.id, version: 7, outboundCarrier: 'Original carrier', outboundTrackingNumber: 'SAVED-TRACKING', fulfilledAt: '2026-09-08T20:14:15.123456Z' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryByRole('button', { name: 'Update kit request' })).toBeNull()
    expect(mocks.shipments).toHaveBeenCalledWith(request.jobId, true)
    for (const key of ['shipping-stock-kit', 'shipping-stock-kits', 'platform-transportation-kit-request', 'platform-transportation-kit-requests', 'transportation-kit-supply', 'sample-shipment-packing', 'lab-service-order', 'platform-order', 'platform-orders']) expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] })
    expect(mocks.dispatch).toHaveBeenCalledTimes(1)
  })

  it('cancels review without dispatching or changing the saved facts', async () => {
    mount(<StockKitRequestRecovery kit={kit} onSaved={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Update kit request' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep reviewing' }))
    expect(screen.queryByRole('dialog')).toBeNull(); expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it('blocks duplicate save and dismissal while busy, then retains failed review for exact retry', async () => {
    let reject!: (error: Error) => void
    mocks.dispatch.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail }))
    const close = vi.fn(), saved = vi.fn()
    mount(<UpdateKitRequestDialog kit={kit} request={request} shipmentId={shipment.id} onClose={close} onSaved={saved} />)
    const confirm = screen.getByRole('button', { name: 'Update kit request' })
    fireEvent.click(confirm); fireEvent.click(confirm)
    await screen.findByRole('button', { name: 'Updating…' })
    expect(mocks.dispatch).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Keep reviewing' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(close).not.toHaveBeenCalled()
    reject(new Error('Request changed. Review its remaining quantity.'))
    expect(await screen.findByText('Kit request was not updated')).toBeTruthy()
    expect(screen.getByText('SAVED-TRACKING')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Update kit request' }))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(mocks.dispatch.mock.calls[1]).toEqual(mocks.dispatch.mock.calls[0])
  })

  it('explains a request lookup failure and retries without dispatching', async () => {
    mocks.requests.mockRejectedValueOnce(new Error('Connection interrupted.'))
    mount(<StockKitRequestRecovery kit={kit} onSaved={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry kit request' }))
    expect(await screen.findByRole('button', { name: 'Update kit request' })).toBeTruthy()
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })
})
