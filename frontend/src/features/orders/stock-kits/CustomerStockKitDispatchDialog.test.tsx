import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { standardKit } from '#/test-helpers/shipping-containers'
import { kitRequestFixture } from '#/test-helpers/transportation-kit-requests'
import { CustomerStockKitDispatchDialog } from './CustomerStockKitDispatchDialog'

const mocks = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), dispatch: vi.fn() }))
vi.mock('#/api/transportation-kit-requests', () => ({ getPlatformTransportationKitRequests: mocks.list, getPlatformTransportationKitRequest: mocks.detail }))
vi.mock('#/api/shipping-containers', () => ({ dispatchShippingStockKit: mocks.dispatch }))
vi.mock('../use-order-draft-guard', () => ({ useOrderDraftGuard: () => vi.fn() }))
const kit = { ...standardKit, container: { ...standardKit.container, capacity: 1 }, tubes: [{ id: 'tube-1', supplierBarcode: 'TUBE-001' }] }
const request = { ...kitRequestFixture, lines: kitRequestFixture.lines.map(line => ({ ...line, containerDefinitionId: kit.container.definitionId, requestedQuantity: 1 })) }
const detail = { request, canDispatch: true, dispatchBlockedReason: null, availableStockKits: [{ id: kit.id, kitNumber: kit.kitNumber, containerDefinitionId: kit.container.definitionId, commonName: kit.container.commonName, sku: kit.container.sku, tubeCapacity: 1, version: kit.version }] }
function mount(node: ReactNode, client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) { return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>) }
function fill(label: RegExp, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
async function selectRequest() { await screen.findByRole('option', { name: /Request 20000000/ }); fill(/Kit request/, request.id); await screen.findByText('100 Science Avenue'); await waitFor(() => expect((screen.getByRole('button', { name: 'Record dispatch' }) as HTMLButtonElement).disabled).toBe(false)) }
function fillDispatch() { fill(/Carrier/, 'Saved carrier'); fill(/Tracking number/, 'TRACK-001') }
beforeEach(() => { vi.clearAllMocks(); mocks.list.mockResolvedValue([request]); mocks.detail.mockResolvedValue(detail); mocks.dispatch.mockResolvedValue({ ...kit, status: 'OnTheWay' }) })

describe('Customer stock dispatch to the requested location', () => {
  it('requires a request instead of a Job or sample shipment', async () => {
    mount(<CustomerStockKitDispatchDialog kit={kit} onClose={vi.fn()} onSaved={vi.fn()} />)
    await screen.findByRole('option', { name: /Request 20000000/ }); fillDispatch(); fireEvent.click(screen.getByRole('button', { name: 'Record dispatch' }))
    expect(await screen.findByText('Choose the Customer kit request.')).toBeTruthy()
    expect(screen.queryByLabelText(/Customer Job|shipment/i)).toBeNull(); expect(mocks.dispatch).not.toHaveBeenCalled()
  })
  it('shows the frozen address and dispatches one exact kit using request and location identities', async () => {
    const saved = vi.fn(); mount(<CustomerStockKitDispatchDialog kit={kit} onClose={vi.fn()} onSaved={saved} />)
    await selectRequest(); expect(screen.getByText(/Originating Job TEST-JOB/)).toBeTruthy(); expect(screen.getByText('1 kit still needed in this size; this dispatch sends 1.')).toBeTruthy()
    fillDispatch(); fireEvent.click(screen.getByRole('button', { name: 'Record dispatch' }))
    await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledWith(kit.id, { requestId: request.id, deliveryLocationId: request.deliveryLocationId, version: kit.version, outboundCarrier: 'Saved carrier', outboundTrackingNumber: 'TRACK-001', fulfilledAt: expect.stringMatching(/Z$/) }))
    expect(mocks.dispatch.mock.calls[0][1]).not.toHaveProperty('shipmentId'); await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
  })
  it('excludes cancelled, complete and unrelated-size requests', async () => {
    mocks.list.mockResolvedValue([{ ...request, status: 'Cancelled' }, { ...request, id: 'closed', status: 'Received' }, { ...request, id: 'other', lines: request.lines.map(line => ({ ...line, containerDefinitionId: 'other-size' })) }])
    mount(<CustomerStockKitDispatchDialog kit={kit} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(await screen.findByText(/No open Customer request needs this container size/)).toBeTruthy(); expect(screen.getAllByRole('option')).toHaveLength(1); expect(mocks.dispatch).not.toHaveBeenCalled()
  })
  it('obeys authoritative readiness when a request closes or the physical kit is unavailable', async () => {
    mocks.detail.mockResolvedValue({ ...detail, canDispatch: false, dispatchBlockedReason: 'The request was cancelled before dispatch.' })
    mount(<CustomerStockKitDispatchDialog kit={kit} onClose={vi.fn()} onSaved={vi.fn()} />)
    await screen.findByRole('option', { name: /Request 20000000/ }); fill(/Kit request/, request.id)
    expect(await screen.findByText('The request was cancelled before dispatch.')).toBeTruthy(); expect((screen.getByRole('button', { name: 'Record dispatch' }) as HTMLButtonElement).disabled).toBe(true); expect(mocks.dispatch).not.toHaveBeenCalled()
  })
  it('keeps a failed dispatch draft and exact kit version for deliberate retry', async () => {
    mocks.dispatch.mockRejectedValueOnce(new Error('The kit changed before dispatch.'))
    mount(<CustomerStockKitDispatchDialog kit={kit} onClose={vi.fn()} onSaved={vi.fn()} />)
    await selectRequest(); fillDispatch(); fireEvent.click(screen.getByRole('button', { name: 'Record dispatch' }))
    expect(await screen.findByText('Dispatch was not recorded')).toBeTruthy(); expect((screen.getByLabelText(/Tracking number/) as HTMLInputElement).value).toBe('TRACK-001')
    fireEvent.click(screen.getByRole('button', { name: 'Record dispatch' })); await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledTimes(2)); expect(mocks.dispatch.mock.calls[1]).toEqual(mocks.dispatch.mock.calls[0])
  })
  it('retains typed fields on a request refresh error and recovers without closing the form', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mount(<CustomerStockKitDispatchDialog kit={kit} onClose={vi.fn()} onSaved={vi.fn()} />, client)
    await selectRequest(); fillDispatch(); mocks.detail.mockRejectedValueOnce(new Error('Connection interrupted.'))
    await act(async () => { await client.invalidateQueries({ queryKey: ['platform-transportation-kit-request', request.id] }) })
    expect(await screen.findByText('Kit request could not be checked')).toBeTruthy(); expect((screen.getByLabelText(/Tracking number/) as HTMLInputElement).value).toBe('TRACK-001'); expect((screen.getByRole('button', { name: 'Record dispatch' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Retry request check' })); await waitFor(() => expect((screen.getByRole('button', { name: 'Record dispatch' }) as HTMLButtonElement).disabled).toBe(false)); expect(mocks.dispatch).not.toHaveBeenCalled()
  })
  it('guards dirty dismissal and prevents duplicate dispatch while busy', async () => {
    const close = vi.fn(); vi.spyOn(window, 'confirm').mockReturnValue(false); mocks.dispatch.mockReturnValue(new Promise(() => {}))
    mount(<CustomerStockKitDispatchDialog kit={kit} onClose={close} onSaved={vi.fn()} />)
    await selectRequest(); fillDispatch(); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(close).not.toHaveBeenCalled()
    const save = screen.getByRole('button', { name: 'Record dispatch' }); fireEvent.click(save); fireEvent.click(save); await screen.findByRole('button', { name: 'Recording…' })
    expect(mocks.dispatch).toHaveBeenCalledTimes(1); expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(close).not.toHaveBeenCalled()
  })
})
