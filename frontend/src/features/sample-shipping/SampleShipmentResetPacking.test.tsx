import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SampleShipmentPackingReset, SampleShipmentWorkflow } from '#/api/sample-shipping'
import { shippingFixture } from '#/test-helpers/sample-shipping'
import { SampleShipmentResetPacking } from './SampleShipmentResetPacking'

const mocks = vi.hoisted(() => ({ get: vi.fn(), reset: vi.fn(), navigate: vi.fn() }))
vi.mock('#/api/sample-shipping', () => ({ getSampleShipmentPackingReset: mocks.get, resetSampleShipmentPacking: mocks.reset }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))

const eligible: SampleShipmentPackingReset = {
  canReset: true, blockedReason: null, containerCount: 2, tubeCount: 30,
  shipments: [{ shipmentId: 'shipment-1', version: 3 }, { shipmentId: 'shipment-2', version: 7 }, { shipmentId: 'pool-1', version: 4 }],
}
const pool: SampleShipmentWorkflow = { ...shippingFixture, id: 'pool-1', isPackingPool: true, container: null, version: 5 }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.get.mockReset().mockResolvedValue(eligible)
  mocks.reset.mockReset().mockResolvedValue(pool)
})

function show(canManage = true, scanActive = false, initialShipment = shippingFixture, writesBlocked = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const view = (shipment = initialShipment, active = scanActive) => <QueryClientProvider client={client}><SampleShipmentResetPacking shipment={shipment} canManage={canManage} scanActive={active} writesBlocked={writesBlocked} /></QueryClientProvider>
  const rendered = render(view())
  return { client, refresh: (shipment: SampleShipmentWorkflow) => rendered.rerender(view(shipment)), setScanActive: (active: boolean) => rendered.rerender(view(initialShipment, active)) }
}
async function openReview() {
  const action = screen.getByRole('button', { name: 'Reset container configuration' })
  await waitFor(() => expect(action).toHaveProperty('disabled', false))
  fireEvent.click(action)
  return screen.getByRole('dialog', { name: 'Reset container configuration?' })
}
function confirm(dialog: HTMLElement) { fireEvent.click(within(dialog).getByRole('button', { name: 'Reset container configuration' })) }

describe('changing a confirmed container plan', () => {
  it('does not offer or query the action to a user without management access', () => {
    show(false)
    expect(screen.queryByRole('button', { name: 'Reset container configuration' })).toBeNull()
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.reset).not.toHaveBeenCalled()
  })

  it('blocks opening and confirmation while a tube scan is unfinished even when the server permits reset', async () => {
    const { setScanActive } = show(true, true)
    const reason = 'Finish or discard the current tube scan before changing containers.'
    expect(screen.getByText(reason)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', true)
    setScanActive(false)
    const dialog = await openReview()
    setScanActive(true)
    expect(within(dialog).getByText(reason)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', true)
    confirm(dialog)
    expect(mocks.reset).not.toHaveBeenCalled()
    setScanActive(false)
    expect(within(dialog).getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', false)
    expect(mocks.reset).not.toHaveBeenCalled()
  })

  it.each([
    'Tube scanning has already started for another container in this Job.',
    'A registered kit has already been assigned to this Job.',
    'A shipping packet has already been issued for this Job.',
  ])('honors the server block even when this shipment has no visible matches: %s', async reason => {
    mocks.get.mockResolvedValue({ ...eligible, canReset: false, blockedReason: reason })
    show()
    expect(await screen.findByText(reason)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', true)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mocks.reset).not.toHaveBeenCalled()
  })

  const inactiveReason = 'This container selection is no longer active. Open a current prepared container to change the containers for this job.'
  const insertReason = 'Containers cannot be changed because a shipping insert has already been issued for this job.'
  const issuedShipment: SampleShipmentWorkflow = {
    ...shippingFixture, status: 'ReadyToShip',
    currentPacket: { id: 'insert-1', revision: 1, packetNumber: 'INSERT-1', barcode: 'INSERT-BARCODE-1', issuedAt: '2026-09-10T01:00:00Z', isVoided: false },
  }

  it.each(['ReadyToShip', 'Shipped', 'Delivered', 'Received'])('explains the issued insert on a current %s container while preserving the server block', async status => {
    mocks.get.mockResolvedValue({ ...eligible, canReset: false, blockedReason: inactiveReason })
    show(true, false, { ...issuedShipment, status })
    expect(await screen.findByText(insertReason)).toBeTruthy()
    expect(screen.queryByText(inactiveReason)).toBeNull()
    expect(screen.getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', true)
    expect(mocks.reset).not.toHaveBeenCalled()
  })

  it.each([
    { name: 'cancelled', shipment: { ...issuedShipment, status: 'Cancelled' } },
    { name: 'unconfigured', shipment: { ...issuedShipment, container: null } },
    { name: 'packing pool', shipment: { ...issuedShipment, isPackingPool: true } },
    { name: 'empty', shipment: { ...issuedShipment, crosswalk: [] } },
  ])('retains the server explanation for a $name selection even with retained insert information', async ({ shipment }) => {
    mocks.get.mockResolvedValue({ ...eligible, canReset: false, blockedReason: inactiveReason })
    show(true, false, shipment)
    expect(await screen.findByText(inactiveReason)).toBeTruthy()
    expect(screen.queryByText(insertReason)).toBeNull()
    expect(screen.getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', true)
    expect(mocks.reset).not.toHaveBeenCalled()
  })

  it.each([
    { scanActive: true, writesBlocked: false, reason: 'Finish or discard the current tube scan before changing containers.' },
    { scanActive: true, writesBlocked: true, reason: 'Current shipment information must be verified before resetting.' },
  ])('keeps the temporary block ahead of the issued-insert explanation: $reason', async ({ scanActive, writesBlocked, reason }) => {
    mocks.get.mockResolvedValue({ ...eligible, canReset: false, blockedReason: inactiveReason })
    show(true, scanActive, issuedShipment, writesBlocked)
    await waitFor(() => expect(mocks.get).toHaveBeenCalled())
    expect(screen.getByText(reason)).toBeTruthy()
    expect(screen.queryByText(insertReason)).toBeNull()
    expect(screen.getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', true)
    expect(mocks.reset).not.toHaveBeenCalled()
  })

  it('explains all containers and tubes are affected while retaining the finalized sample list, and cancels without writing', async () => {
    show()
    const dialog = await openReview()
    expect(dialog.textContent).toContain('All 2 selected containers will be removed. All 30 tubes will return to container selection.')
    expect(dialog.textContent).toContain('Your finalized sample list will stay unchanged.')
    expect(dialog.textContent).toContain('cannot be undone after tube scanning starts')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep containers' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(mocks.reset).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('sends every reviewed shipment version, refreshes related views, and navigates to the returned pool', async () => {
    const { client } = show()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const dialog = await openReview()
    confirm(dialog)
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: '/sample-shipping/$shipmentId', params: { shipmentId: pool.id } }))
    expect(mocks.reset).toHaveBeenCalledExactlyOnceWith(shippingFixture.id, { shipments: eligible.shipments })
    expect(client.getQueryData(['sample-shipment', pool.id])).toEqual(pool)
    for (const key of ['sample-shipment', 'sample-shipments', 'platform-sample-shipments', 'sample-shipment-packing', 'sample-shipment-recommendation', 'sample-packing-preview', 'sample-shipment-packing-reset', 'sample-shipping-packet', 'transportation-kit-supply']) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] })
    }
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['lab-service-order', shippingFixture.authorizationSourceId] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trial-project', shippingFixture.authorizationSourceId] })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps a stale review after failure until the user explicitly reviews the updated containers', async () => {
    const updated = { ...eligible, containerCount: 3, shipments: [{ shipmentId: 'shipment-1', version: 4 }, { shipmentId: 'shipment-2', version: 8 }, { shipmentId: 'shipment-3', version: 1 }, { shipmentId: 'pool-1', version: 5 }] }
    mocks.get.mockResolvedValueOnce(eligible).mockResolvedValue(updated)
    mocks.reset.mockRejectedValueOnce(new Error('The container plan changed.'))
    show()
    const dialog = await openReview()
    confirm(dialog)
    expect(await within(dialog).findByText(/The container plan changed/)).toBeTruthy()
    const reviewUpdated = await within(dialog).findByRole('button', { name: 'Review updated containers' })
    expect(dialog.textContent).toContain('All 2 selected containers')
    expect(within(dialog).getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', true)
    expect(mocks.reset).toHaveBeenCalledTimes(1)
    fireEvent.click(reviewUpdated)
    expect(dialog.textContent).toContain('All 3 selected containers')
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', false))
    confirm(dialog)
    await waitFor(() => expect(mocks.reset).toHaveBeenCalledTimes(2))
    expect(mocks.reset).toHaveBeenNthCalledWith(1, shippingFixture.id, { shipments: eligible.shipments })
    expect(mocks.reset).toHaveBeenNthCalledWith(2, shippingFixture.id, { shipments: updated.shipments })
  })

  it('keeps the dialog and prevents retry when a scan starts before confirmation reaches the server', async () => {
    const reason = 'Tube scanning has already started for this Job.'
    mocks.get.mockResolvedValueOnce(eligible).mockResolvedValue({ ...eligible, canReset: false, blockedReason: reason })
    mocks.reset.mockRejectedValueOnce(new Error('The packing plan can no longer be changed.'))
    show()
    const dialog = await openReview()
    confirm(dialog)
    expect(await within(dialog).findByText(reason)).toBeTruthy()
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', true))
    expect(within(dialog).queryByRole('button', { name: 'Review updated containers' })).toBeNull()
    expect(mocks.reset).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('blocks duplicate confirmation and dismissal while the reset is pending', async () => {
    let resolveReset!: (value: SampleShipmentWorkflow) => void
    mocks.reset.mockImplementationOnce(() => new Promise<SampleShipmentWorkflow>(resolve => { resolveReset = resolve }))
    show()
    const dialog = await openReview()
    const action = within(dialog).getByRole('button', { name: 'Reset container configuration' })
    fireEvent.click(action)
    fireEvent.click(action)
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Resetting…' })).toHaveProperty('disabled', true))
    expect(within(dialog).getByRole('button', { name: 'Keep containers' })).toHaveProperty('disabled', true)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(mocks.reset).toHaveBeenCalledTimes(1)
    await act(async () => { resolveReset(pool) })
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled())
  })

  it('retries a failed eligibility check without resetting anything', async () => {
    mocks.get.mockRejectedValueOnce(new Error('Connection unavailable.'))
    show()
    expect(await screen.findByText('Container choices could not be checked.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Retry container check' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', false))
    expect(mocks.reset).not.toHaveBeenCalled()
  })

  it('checks server eligibility again when the shipment version and visible matches change', async () => {
    const { refresh } = show()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', false))
    mocks.get.mockResolvedValue({ ...eligible, canReset: false, blockedReason: 'Tube scanning has already started.' })
    refresh({ ...shippingFixture, version: 4, crosswalk: shippingFixture.crosswalk.map(item => ({ ...item, supplierTubeBarcode: 'REGISTERED-123' })) })
    expect(await screen.findByText('Tube scanning has already started.')).toBeTruthy()
    expect(mocks.get).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Reset container configuration' })).toHaveProperty('disabled', true)
    expect(mocks.reset).not.toHaveBeenCalled()
  })
})
