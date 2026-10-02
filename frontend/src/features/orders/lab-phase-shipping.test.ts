import { describe, expect, it } from 'vitest'
import type { LabSampleTubeWorkspace } from '#/api/order-management'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import { phasedLabOrder } from '#/test-helpers/phased-lab-quote'
import { kitRequestFixture } from '#/test-helpers/transportation-kit-requests'
import { currentShippingPhase, phaseShippingProgress } from './lab-phase-shipping'
import { shippingPhasePlan, phaseShippingOrder, sentPhaseShipment, shippedPhasePairs } from '#/test-helpers/lab-phase-shipping'

const empty: LabSampleTubeWorkspace = { pairs: [], kits: [], preparationPhaseIds: ['phase-1', 'phase-2'], preparedPhaseIds: [], preparationSources: [], expectedSampleCount: 10, expectedSequencingRunCount: 15, isFinalized: false, minimumSampleAmount: null, sampleAmountUnit: null }

describe('Independent phase shipping progress', () => {
  it('advances in position order after full dispatch without waiting for results', () => {
    const phases = [...shippingPhasePlan.phases].reverse()
    expect(currentShippingPhase(phases, phaseShippingOrder, shippedPhasePairs, [])?.id).toBe('phase-1')
    expect(currentShippingPhase(phases, phaseShippingOrder, shippedPhasePairs, [sentPhaseShipment])?.id).toBe('phase-2')
    const incomplete = { ...sentPhaseShipment, crosswalk: sentPhaseShipment.crosswalk.slice(0, 4) }
    expect(currentShippingPhase(phases, phaseShippingOrder, shippedPhasePairs, [incomplete])?.id).toBe('phase-1')
    const pending = { ...sentPhaseShipment, id: 'pending', status: 'Preparing' as const, shippedAt: null }
    expect(currentShippingPhase(phases, phaseShippingOrder, shippedPhasePairs, [sentPhaseShipment, pending])?.id).toBe('phase-1')
    expect(phases[0].position).toBe(2)
    expect(phases[1].deliveredSamples).toBe(0)
  })

  it('does not substitute results or mixed-phase shipment contents for complete shipping', () => {
    const delivered = shippingPhasePlan.phases.map(p => ({ ...p, deliveredSamples: p.sampleCount }))
    expect(currentShippingPhase(delivered, phaseShippingOrder, shippedPhasePairs, [])?.id).toBe('phase-1')
    const mixed = { ...sentPhaseShipment, crosswalk: [...sentPhaseShipment.crosswalk, { ...sentPhaseShipment.crosswalk[0], submittedSpecimenId: 'phase-2-sample-1' }] }
    expect(currentShippingPhase(delivered, phaseShippingOrder, shippedPhasePairs, [sentPhaseShipment, mixed])?.id).toBe('phase-1')
  })

  it('skips cancelled phases and waits for unavailable progress', () => {
    expect(currentShippingPhase(shippingPhasePlan.phases.map(p => p.position === 1 ? { ...p, lifecycle: 'Cancelled' } : p), phaseShippingOrder, empty)?.id).toBe('phase-2')
    expect(currentShippingPhase()).toBeUndefined()
  })
  it('acceptance alone leaves every phase at request kits', () => {
    const order = { ...phasedLabOrder, placedAt: '2026-10-01T12:00:00Z' }
    expect(phaseShippingProgress(shippingPhasePlan.phases[0], order, [], empty).next).toBe('request')
    expect(phaseShippingProgress(shippingPhasePlan.phases[1], order, [], empty).next).toBe('request')
  })

  it('a phase request and partial receipt do not complete another phase', () => {
    const request = { ...kitRequestFixture, phaseId: 'phase-1', status: 'PartiallyDispatched' as const }
    expect(phaseShippingProgress(shippingPhasePlan.phases[0], phasedLabOrder, [request], empty).next).toBe('receive')
    expect(phaseShippingProgress(shippingPhasePlan.phases[1], phasedLabOrder, [request], empty).next).toBe('request')
    expect(phaseShippingProgress(shippingPhasePlan.phases[0], phasedLabOrder, [{ ...request, status: 'Received' }], empty).next).toBe('prepare')
  })

  it('allocated received stock needs no outbound order and does not leak across phases', () => {
    const workspace = { ...empty, kits: [{ id: 'kit', phaseId: 'phase-1', kitNumber: 'KIT-1', tubeCapacity: 20, availableTubeCount: 20, maximumSampleAmount: 100, sampleAmountUnit: 'µL', isUsable: true }] }
    expect(phaseShippingProgress(shippingPhasePlan.phases[0], phasedLabOrder, [], workspace).next).toBe('prepare')
    expect(phaseShippingProgress(shippingPhasePlan.phases[0], phasedLabOrder, [], workspace).usesReceivedStock).toBe(true)
    expect(phaseShippingProgress(shippingPhasePlan.phases[1], phasedLabOrder, [], workspace).next).toBe('request')
  })

  it('requires enough confirmed usable stock for the whole phase and waits for a pending delivery', () => {
    const kit = { id: 'kit', phaseId: 'phase-1', kitNumber: 'KIT-1', tubeCapacity: 20, availableTubeCount: 20, maximumSampleAmount: 100, sampleAmountUnit: 'µL', isUsable: true }
    for (const unavailable of [{ ...kit, isUsable: false }, { ...kit, isUsable: undefined }, { ...kit, availableTubeCount: 4 }, { ...kit, finishedAt: '2026-10-01T12:00:00Z' }]) {
      expect(phaseShippingProgress(shippingPhasePlan.phases[0], phasedLabOrder, [], { ...empty, kits: [unavailable] }).next).toBe('request')
    }
    const progress = phaseShippingProgress(shippingPhasePlan.phases[0], phasedLabOrder, [{ ...kitRequestFixture, phaseId: 'phase-1', status: 'Dispatched' }], { ...empty, kits: [kit] })
    expect(progress.next).toBe('receive')
    expect(progress.usesReceivedStock).toBe(false)
  })

  it('shows fulfillment and partial physical receipt independently of the next step', () => {
    const request = { ...kitRequestFixture, phaseId: 'phase-1' }
    for (const [status, label] of [['Pending', 'Request received'], ['PartiallyDispatched', 'Partially sent'], ['Dispatched', 'Sent'], ['Received', 'Received']] as const) {
      expect(phaseShippingProgress(shippingPhasePlan.phases[0], phasedLabOrder, [{ ...request, status }], empty).receiveStatus).toBe(label)
    }
    const partial = { ...request, status: 'Dispatched' as const, lines: request.lines.map(line => ({ ...line, receivedQuantity: 1 })) }
    const progress = phaseShippingProgress(shippingPhasePlan.phases[0], phasedLabOrder, [partial], empty)
    expect(progress.receiveStatus).toBe('Partially received')
    expect(progress.next).toBe('receive')
  })

  it('only the selected phase shipments establish that its samples were sent', () => {
    const order = { ...phasedLabOrder, samples: [{ ...phasedLabOrder.samples[0], id: 'first', phaseId: 'phase-1' }, { ...phasedLabOrder.samples[0], id: 'later', phaseId: 'phase-2' }] }
    const workspace = { ...empty, preparedPhaseIds: ['phase-1', 'phase-2'] }
    const shipment = (id: string, specimen: string, sent: boolean) => ({ id, status: sent ? 'Shipped' : 'Preparing', shippedAt: sent ? '2026-10-01T12:00:00Z' : null, crosswalk: [{ submittedSpecimenId: specimen }] }) as SampleShipmentWorkflow
    const shipments = [shipment('one', 'first', true), shipment('two', 'later', false)]
    expect(phaseShippingProgress({ ...shippingPhasePlan.phases[0], sampleCount: 1 }, order, [], workspace, shipments).allSent).toBe(true)
    expect(phaseShippingProgress(shippingPhasePlan.phases[1], order, [], workspace, shipments).next).toBe('send')
    const incomplete = { ...order, samples: [...order.samples, { ...order.samples[0], id: 'uncovered' }] }
    expect(phaseShippingProgress(shippingPhasePlan.phases[0], incomplete, [], workspace, shipments).next).toBe('send')
  })

  it('cancelled and unassigned historical requests do not imply phase fulfillment', () => {
    expect(phaseShippingProgress(shippingPhasePlan.phases[0], phasedLabOrder, [{ ...kitRequestFixture, phaseId: 'phase-1', status: 'Cancelled' }, kitRequestFixture], empty).next).toBe('request')
  })
})
