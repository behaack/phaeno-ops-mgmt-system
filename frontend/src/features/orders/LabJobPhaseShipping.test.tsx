import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { phasedLabOrder } from '#/test-helpers/phased-lab-quote'
import { shippingPhasePlan, emptyPhasePairs, phaseShippingOrder, sentPhaseShipment, shippedPhasePairs, singleShippingOrder, singleShippingPlan, singleShippingPairs } from '#/test-helpers/lab-phase-shipping'
import type { LabPhasePlan } from '#/api/lab-phases'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import type { LabSampleTubeWorkspace, LabServiceOrder } from '#/api/order-management'
import { deliveryLocationFixture } from '#/test-helpers/transportation-kit-requests'
import { kitRequestFixture } from '#/test-helpers/transportation-kit-requests'
import type { LabOrderKitWorkspace, TransportationKitRequest } from '#/api/transportation-kit-requests'
import { LabJobPhaseShipping } from './LabJobPhaseShipping'

const mocks = vi.hoisted(() => ({ supply: vi.fn(), request: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: () => ({ status: 'idle' }) }))
vi.mock('#/api/transportation-kit-requests', () => ({ getLabPhaseKitSupply: mocks.supply, requestLabPhaseKits: mocks.request }))
vi.mock('./LabJobKitDeliveryPanel', () => ({ LabJobKitDeliveryPanel: () => null }))
const supply: LabOrderKitWorkspace = { requests: [], locations: [deliveryLocationFixture], phases: [1, 2].map(n => ({ phaseId: `phase-${n}`, phaseName: `Phase ${n}`, sampleCount: 5, deliveryLocationId: deliveryLocationFixture.id, receivedStock: [], canRequest: true, blockedReason: null, recommendation: { tubeCount: 5, containerCount: 1, totalCapacity: 20, unusedCapacity: 15, unallocatedTubes: 0, isComplete: true, containers: [], explanation: 'One compatible kit for this phase.' } })) }
const sentRequest: TransportationKitRequest = {
  ...kitRequestFixture, phaseId: 'phase-1', status: 'Dispatched', canConfirmReceipt: true, canCancel: false,
  lines: kitRequestFixture.lines.map(line => ({ ...line, dispatchedQuantity: line.requestedQuantity })),
  kits: [1, 2].map(n => ({ stockKitId: `kit-${n}`, kitNumber: `KIT-${n}`, requestLineId: kitRequestFixture.lines[0].id,
    containerDefinitionId: kitRequestFixture.lines[0].containerDefinitionId, outboundCarrier: 'Example carrier', outboundTrackingNumber: 'KIT-TRACKING', dispatchedAt: '2026-10-03T12:00:00Z', receivedAt: null })),
}

function View({ order = phaseShippingOrder, plan = shippingPhasePlan, pairs = emptyPhasePairs, shipments = [], onStep = vi.fn(), canManage = true }: { order?: LabServiceOrder; plan?: LabPhasePlan; pairs?: LabSampleTubeWorkspace; shipments?: SampleShipmentWorkflow[]; onStep?: (step: string) => void; canManage?: boolean }) {
  const [open, setOpen] = useState(false)
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }))
  return <QueryClientProvider client={client}><LabJobPhaseShipping order={order} phasePlan={plan} phaseState="ready" onPhaseRefresh={vi.fn()} pairs={pairs} shipments={shipments} shippingReady canManage={canManage} requestOpen={open} onRequestOpenChange={setOpen} onStepSelect={onStep} onModalChange={vi.fn()} /></QueryClientProvider>
}

beforeEach(() => { vi.clearAllMocks(); mocks.supply.mockResolvedValue(supply); mocks.request.mockResolvedValue(supply) })
describe('On-demand phase request dialog', () => {
  it('uses order wording for one sample while preserving the kit request step and confirmation', async () => {
    mocks.supply.mockResolvedValue({ ...supply, phases: [{ ...supply.phases[0], sampleCount: 1 }] })
    render(<View order={singleShippingOrder} plan={singleShippingPlan} pairs={singleShippingPairs} />)
    expect(screen.getByRole('heading', { name: 'Shipping (1 sample)' })).toBeTruthy()
    expect(screen.getByText('Request kits when you’re ready to send your samples.')).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Request transportation kits' }))
    const dialog = screen.getByRole('dialog', { name: 'Request transportation kits' })
    expect(await within(dialog).findByText('1 sample')).toBeTruthy()
    expect(within(dialog).queryByText(/Phase 1|Each phase/)).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Request kits' })).toBeTruthy()
    expect(mocks.request).not.toHaveBeenCalled()
  })
  it('directs a fully sent single-order shipment to progress without another kit prompt', async () => {
    const onStep = vi.fn()
    render(<View order={{ ...singleShippingOrder, samples: phaseShippingOrder.samples.slice(0, 1) }} plan={singleShippingPlan}
      pairs={{ ...singleShippingPairs, preparedPhaseIds: ['phase-1'] }} shipments={[{ ...sentPhaseShipment, crosswalk: sentPhaseShipment.crosswalk.slice(0, 1) }]} onStep={onStep} />)
    fireEvent.click(await screen.findByRole('button', { name: 'View progress' }))
    expect(screen.getByRole('heading', { name: 'Shipping (1 sample)' })).toBeTruthy()
    expect(screen.getByText('Shipping finished')).toBeTruthy()
    expect(screen.queryByText('Request kits when you’re ready to send your samples.')).toBeNull()
    expect(onStep).toHaveBeenCalledWith('phase-progress')
    expect(mocks.request).not.toHaveBeenCalled()
  })
  it('explains when previously received stock completes supply without another delivery', async () => {
    const onStep = vi.fn()
    render(<View onStep={onStep} pairs={{ ...emptyPhasePairs, kits: [{ id: 'kit', kitNumber: 'KIT-1', phaseId: 'phase-1', tubeCapacity: 20, availableTubeCount: 20, isUsable: true, maximumSampleAmount: 100, sampleAmountUnit: 'µL' }] }} />)
    const prepare = await screen.findByRole('button', { name: 'Prepare samples' })
    expect(screen.getByText('Existing kits allocated')).toBeTruthy()
    expect(screen.getByText('Received · existing stock')).toBeTruthy()
    expect(screen.getByText('This phase uses 1 previously received kit, covering 5 samples. No new delivery is needed.')).toBeTruthy()
    fireEvent.click(prepare)
    expect(onStep).toHaveBeenCalledWith('prepare')
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it.each(['single order', 'multiple phases'])('waits for Phaeno dispatch before offering receipt for %s', async layout => {
    mocks.supply.mockResolvedValue({ ...supply, requests: [{ ...kitRequestFixture, phaseId: 'phase-1' }] })
    render(layout === 'single order' ? <View order={singleShippingOrder} plan={singleShippingPlan} pairs={singleShippingPairs} /> : <View />)
    await screen.findByText('Wait for Phaeno to send kits')
    expect(screen.getByText('Request received')).toBeTruthy()
    expect(screen.getByText('Receive kits').closest('li')?.getAttribute('aria-current')).toBe('step')
    expect(screen.queryByRole('button', { name: 'Record kit receipt' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Prepare samples' })).toBeNull()
    expect(screen.getByText('Next step', { selector: '[aria-live] p' }).parentElement?.parentElement?.querySelector('button')).toBeNull()
    expect(screen.getByRole('button', { name: 'View kit order' })).toBeTruthy()
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('allows receipt after partial dispatch without opening preparation', async () => {
    mocks.supply.mockResolvedValue({ ...supply, requests: [{ ...sentRequest, status: 'PartiallyDispatched',
      kits: sentRequest.kits.slice(0, 1), lines: sentRequest.lines.map(line => ({ ...line, dispatchedQuantity: 1 })) }] })
    render(<View />)
    await screen.findByRole('button', { name: 'Record kit receipt' })
    expect(screen.getByText('Partially sent')).toBeTruthy()
    expect(screen.getByText('Phaeno has sent kits. Confirm each kit only after it physically arrives.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Prepare samples' })).toBeNull()
  })

  it('waits for remaining dispatch after every sent kit in a partial delivery is received', async () => {
    mocks.supply.mockResolvedValue({ ...supply, requests: [{ ...sentRequest, status: 'PartiallyDispatched', canConfirmReceipt: false,
      kits: [{ ...sentRequest.kits[0], receivedAt: '2026-10-03T14:00:00Z' }],
      lines: sentRequest.lines.map(line => ({ ...line, dispatchedQuantity: 1, receivedQuantity: 1 })) }] })
    render(<View />)
    await screen.findByText('Wait for Phaeno to send kits')
    expect(screen.getByText('Partially received')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Record kit receipt' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Prepare samples' })).toBeNull()
  })

  it.each(['member', 'receipt permission unavailable'])('keeps sent kit orders viewable without offering receipt for %s', async role => {
    mocks.supply.mockResolvedValue({ ...supply, requests: [{ ...sentRequest, canConfirmReceipt: false }] })
    render(<View canManage={role !== 'member'} />)
    await screen.findByRole('button', { name: 'View kit order' })
    expect(screen.getByText('Sent')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Record kit receipt' })).toBeNull()
  })

  it('keeps Receive current for an outbound kit even when some received stock is allocated', async () => {
    mocks.supply.mockResolvedValue({ ...supply, requests: [sentRequest] })
    render(<View pairs={{ ...emptyPhasePairs, kits: [{ id: 'kit', kitNumber: 'KIT-1', phaseId: 'phase-1', tubeCapacity: 2, availableTubeCount: 2, isUsable: true, maximumSampleAmount: 100, sampleAmountUnit: 'µL' }] }} />)
    await screen.findByRole('button', { name: 'Record kit receipt' })
    expect(screen.getByText('Receive kits').closest('li')?.getAttribute('aria-current')).toBe('step')
    expect(screen.queryByRole('button', { name: 'Prepare samples' })).toBeNull()
    expect(screen.getByText('Sent')).toBeTruthy()
    expect(screen.queryByText('Received · existing stock')).toBeNull()
  })

  it('does not request kits on load and puts a real body between header and footer', async () => {
    render(<View />)
    const opener = await screen.findByRole('button', { name: 'Request transportation kits' })
    expect(mocks.request).not.toHaveBeenCalled()
    expect(screen.getByText('Next step', { selector: '[aria-live] p' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Shipping: Phase 1 (5 samples)' })).toBeTruthy()
    expect(screen.queryByText('Ordering and shipping')).toBeNull()
    expect(screen.queryByText('Phase 1 · 5 samples')).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Phase' })).toBeNull()
    expect(screen.queryByLabelText('Phase shipping overview')).toBeNull()
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Request transportation kits' })
    expect(dialog.querySelector('[data-slot="dialog-body"]')).toBeTruthy()
    expect(await within(dialog).findByText('100 Science Avenue')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' })))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Request transportation kits' })))
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('requests only the current phase and preserves the confirmed address and retry key after failure', async () => {
    mocks.request.mockRejectedValue(new Error('Temporary failure'))
    render(<View />)
    fireEvent.click(await screen.findByRole('button', { name: 'Request transportation kits' }))
    const dialog = screen.getByRole('dialog', { name: 'Request transportation kits' })
    expect(within(dialog).queryByRole('checkbox')).toBeNull()
    expect(within(dialog).queryByText(/Phase 2/)).toBeNull()
    await waitFor(() => expect((within(dialog).getByRole('button', { name: 'Request kits' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request kits' }))
    await within(dialog).findByText('Kit request not submitted')
    const first = mocks.request.mock.calls[0]
    expect(first[1]).toEqual({ orderVersion: phasedLabOrder.version, phaseIds: ['phase-1'], deliveryLocationId: deliveryLocationFixture.id, deliveryLocationVersion: deliveryLocationFixture.version })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request kits' }))
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2))
    expect(mocks.request.mock.calls[1][2]).toBe(first[2])
    expect(within(dialog).getByText('Phase 1 · 5 samples')).toBeTruthy()
  })

  it('opens phase two kit request after phase one is shipped and retains its status', async () => {
    const plan = { ...shippingPhasePlan, phases: shippingPhasePlan.phases.map(p => p.position === 1 ? { ...p, containerCount: 1, sentContainers: 1 } : { ...p, name: 'Liver Cancer Demo Project' }) }
    mocks.supply.mockResolvedValue({ ...supply, phases: supply.phases.map(p => p.phaseId === 'phase-2' ? { ...p, phaseName: 'Liver Cancer Demo Project' } : p) })
    render(<View plan={plan} pairs={shippedPhasePairs} shipments={[sentPhaseShipment]} />)
    expect(screen.queryByRole('heading', { name: 'Sent phases' })).toBeNull()
    expect(mocks.request).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Shipping: Phase 2 · Liver Cancer Demo Project (5 samples)' })).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Request transportation kits' }))
    expect(await within(screen.getByRole('dialog')).findByText('Liver Cancer Demo Project · 5 samples')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Request kits' }))
    await waitFor(() => expect(mocks.request).toHaveBeenCalled())
    expect(mocks.request.mock.calls[0][1].phaseIds).toEqual(['phase-2'])
  })

  it('offers phase progress after all phases ship instead of another kit request', async () => {
    const onStep = vi.fn()
    const second = { ...sentPhaseShipment, id: 'second', crosswalk: sentPhaseShipment.crosswalk.map((row, i) => ({ ...row, submittedSpecimenId: `phase-2-sample-${i + 1}` })) }
    render(<View onStep={onStep} pairs={{ ...shippedPhasePairs, preparedPhaseIds: ['phase-1', 'phase-2'] }} shipments={[sentPhaseShipment, second]} />)
    fireEvent.click(await screen.findByRole('button', { name: 'View progress' }))
    expect(onStep).toHaveBeenCalledWith('phase-progress')
    expect(screen.queryByRole('button', { name: 'Request transportation kits' })).toBeNull()
  })

  it('points to the earlier whole-Job kit order when it must be resolved first', async () => {
    mocks.supply.mockResolvedValue({ ...supply, requests: [kitRequestFixture], phases: supply.phases.map(p => ({ ...p, canRequest: false, blockedReason: 'Review the earlier whole-Job kit order first.' })) })
    render(<View />)
    expect(await screen.findByText('Review earlier kit order')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'View kit order' })).toHaveProperty('disabled', false)
    expect(screen.queryByRole('button', { name: 'Request transportation kits' })).toBeNull()
    expect(mocks.request).not.toHaveBeenCalled()
  })
})
