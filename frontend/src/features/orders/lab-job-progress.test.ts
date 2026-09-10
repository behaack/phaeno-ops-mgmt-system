import { describe, expect, it } from 'vitest'
import type { LabServiceOrder, Quote } from '#/api/order-management'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import type { ShipmentKitSupply } from '#/api/transportation-kit-requests'
import { shippingFixture, shippingTube } from '#/test-helpers/sample-shipping'
import { buildLabJobProgress, type LabJobProgressInput, type LabJobProgressStepId } from './lab-job-progress'

const recordedAt = '2026-09-10T00:00:00Z'
const now = Date.parse('2026-09-10T01:00:00Z')
const order = {
  id: 'order-1', organizationId: 'org-1', orderNumber: 'JOB-1', status: 'PlacedAwaitingSamples',
  placedAt: recordedAt, submittedAt: recordedAt, sampleRosterFinalizedAt: recordedAt,
  requestedSpecimenCount: 2, samples: [1, 2].map(index => ({ id: `sample-${index}`, customerSampleId: `S-${index}`, quantity: 2 })),
  quotes: [], canEdit: false, canAcceptQuote: false, canPlaceStandardOrder: false,
} as unknown as LabServiceOrder

function shipment(index: number, overrides: Partial<SampleShipmentWorkflow> = {}): SampleShipmentWorkflow {
  const id = `shipment-${index}`
  return {
    ...shippingFixture, id, shipmentNumber: `SHIP-${index}`, status: 'ReadyToShip', expectedTubeCount: 2, orderExpectedTubeCount: 4,
    assignedContainer: {
      stockKitId: `stock-${index}`, kitNumber: `KIT-${index}`, container: shippingFixture.container!, version: 1, status: 'Assigned',
      deliveryLocationId: 'location-1', requestId: null, originatingJobId: order.id, originatingJobNumber: order.orderNumber,
      assignedJobId: order.id, assignedJobNumber: order.orderNumber, reservedShipmentId: id, boundShipmentId: id,
      dispatchedAt: recordedAt, receivedAt: recordedAt,
    },
    crosswalk: [1, 2].map(ordinal => shippingTube(index * 10 + ordinal, {
      submittedSpecimenId: `sample-${index}`, tubeOrdinal: ordinal, tubeCount: 2, totalSampleTubeCount: 2,
      registeredSampleTubeId: `tube-${index}-${ordinal}`, supplierTubeBarcode: `TUBE-${index}-${ordinal}`,
    })),
    currentPacket: { id: `packet-${index}`, revision: 1, packetNumber: `SP-${index}`, barcode: `PACKET-${index}`, issuedAt: recordedAt, isVoided: false },
    ...overrides,
  }
}

function build(overrides: Partial<LabJobProgressInput> = {}) {
  return buildLabJobProgress({ order, shipments: [shipment(1), shipment(2)], shippingState: 'ready', canManageShipping: true, canAcceptOrder: true, now, ...overrides })
}
function find(id: LabJobProgressStepId, overrides: Partial<LabJobProgressInput> = {}) { return build(overrides).steps.find(step => step.id === id)! }
function quote(overrides: Partial<Quote> = {}): Quote {
  return { id: 'quote-1', revision: 1, status: 'Issued', issuedAt: recordedAt, expiresAt: '2026-09-11T00:00:00Z', acceptedAt: null, ...overrides } as Quote
}
function pool(): SampleShipmentWorkflow {
  return { ...shipment(1), id: 'pool', isPackingPool: true, assignedContainer: null, container: null, currentPacket: null, status: 'Preparing',
    crosswalk: [shipment(1), shipment(2)].flatMap(value => value.crosswalk.map(row => ({ ...row, registeredSampleTubeId: null, supplierTubeBarcode: null }))), expectedTubeCount: 4 }
}
function supply(overrides: Partial<ShipmentKitSupply> = {}): ShipmentKitSupply {
  return {
    shipmentId: 'pool', shipmentVersion: 3, jobId: order.id, jobNumber: order.orderNumber, tubeCount: 4,
    deliveryLocationId: 'location-1', locations: [], inventoryStatus: 'RecordedForLocation', request: null,
    recommendation: { tubeCount: 0, containerCount: 0, totalCapacity: 0, unusedCapacity: 0, unallocatedTubes: 0, isComplete: true, containers: [], explanation: 'Received stock covers the tubes.' },
    recordedStock: [{ containerDefinitionId: 'container-20', availableQuantity: 1, inTransitQuantity: 0 }],
    canPrepareSamples: true, preparationBlockedReason: null, canRequestKits: false, requestBlockedReason: null,
    ...overrides,
  }
}

describe('Lab Job customer preparation evidence', () => {
  it('does not treat submitting a request or an order status as customer commitment', () => {
    const value = { ...order, status: 'SubmittedForQuote', placedAt: null, sampleRosterFinalizedAt: null }
    expect(find('confirm-order', { order: value })).toMatchObject({ state: 'waiting-for-phaeno', owner: 'Phaeno' })
    expect(find('samples', { order: value }).state).toBe('not-started')
    expect(find('confirm-order', { order: { ...value, status: 'PlacedAwaitingSamples' } }).state).not.toBe('complete')
  })

  it.each([{ placedAt: recordedAt, quotes: [] }, { placedAt: null, quotes: [quote({ status: 'Accepted', acceptedAt: recordedAt })] }])('recognizes saved placement or an accepted quote independently of later order state', commitment => {
    expect(find('confirm-order', { order: { ...order, ...commitment, status: 'OnHold' } }).state).toBe('complete')
  })

  it('makes quote expiry and administrator responsibility explicit', () => {
    const quoted = { ...order, placedAt: null, status: 'QuoteIssued', canAcceptQuote: true, quotes: [quote()] }
    expect(find('confirm-order', { order: quoted, canAcceptOrder: false })).toMatchObject({ state: 'waiting-for-administrator', owner: 'Your administrator' })
    expect(find('confirm-order', { order: { ...quoted, canAcceptQuote: false }, canAcceptOrder: false }).owner).toBe('Your administrator')
    expect(find('confirm-order', { order: quoted, now: Date.parse(quoted.quotes[0].expiresAt) })).toMatchObject({ state: 'waiting-for-phaeno', owner: 'Phaeno' })
    expect(find('confirm-order', { order: { ...quoted, status: 'DraftRequest', quotes: [], canEdit: true }, canAcceptOrder: false }).owner).toBe('You')
    expect(find('confirm-order', { order: { ...quoted, status: 'DraftRequest', quotes: [], canEdit: false, canSubmit: true }, canAcceptOrder: false }).owner).toBe('You')
  })

  it('shows an authorized administrator the acceptance blocker without implying the quote can be accepted', () => {
    const blocked = { ...order, placedAt: null, status: 'QuoteIssued', quotes: [quote()], canAcceptQuote: false, quoteAcceptanceBlockedReason: 'Review the updated sample requirements.' }
    expect(find('confirm-order', { order: blocked, canAcceptOrder: true })).toMatchObject({ state: 'needs-attention', owner: 'You', detail: 'Review the updated sample requirements.' })
    expect(find('confirm-order', { order: { ...blocked, quoteAcceptanceBlockedReason: null }, canAcceptOrder: true })).toMatchObject({ state: 'needs-attention', owner: 'You', detail: 'Review the order or quote blockers before accepting.' })
    expect(find('confirm-order', { order: blocked, canAcceptOrder: false })).toMatchObject({ state: 'waiting-for-administrator', owner: 'Your administrator' })
    expect(find('confirm-order', { order: { ...blocked, canPlaceStandardOrder: true }, canAcceptOrder: true }).state).toBe('waiting-for-you')
  })

  it('requires roster finalization rather than the number of entered rows', () => {
    expect(find('samples', { order: { ...order, sampleRosterFinalizedAt: null } }).state).toBe('waiting-for-you')
    expect(find('samples', { order: { ...order, sampleRosterFinalizedAt: null }, canManageShipping: false })).toMatchObject({ state: 'waiting-for-administrator', owner: 'Your administrator' })
    expect(find('samples').state).toBe('complete')
  })

  it('counts the complete family and ignores cancelled records and exhausted pools', () => {
    const retired = shipment(3, { status: 'Cancelled', orderExpectedTubeCount: 999 })
    const emptyPool = { ...pool(), crosswalk: [], expectedTubeCount: 0, orderExpectedTubeCount: 0 }
    const progress = build({ shipments: [shipment(1), shipment(2), retired, emptyPool] })
    expect(progress.steps.map(step => step.id)).toEqual(['confirm-order', 'samples', 'kits', 'containers', 'tubes', 'send'])
    expect(progress.steps.filter(step => step.state === 'complete')).toHaveLength(5)
    expect(progress.nextStep?.id).toBe('send')
    expect(progress.shipmentCount).toBe(2)
    expect(progress.nextStep?.label).toBe('Send and record shipments')
    expect(progress.nextStep?.detail).toContain('0 of 2 shipments recorded as sent')
    expect(progress.nextStep?.detail).toContain('Print each current shipping insert and place it inside its container')
    expect(progress.allSent).toBe(false)
    expect(progress.steps.find(step => step.id === 'tubes')?.detail).toContain('All 4 tubes')
  })

  it('keeps unallocated pools and partial dispatch from completing the family', () => {
    const remaining = { ...shipment(2), id: 'pool', isPackingPool: true, container: null, assignedContainer: null, currentPacket: null }
    const progress = build({ shipments: [shipment(1, { shippedAt: recordedAt }), remaining] })
    for (const id of ['containers', 'tubes', 'send']) expect(progress.steps.find(step => step.id === id)?.state).not.toBe('complete')
    expect(progress.allSent).toBe(false)
    expect(progress.shipmentCount).toBeNull()
    expect(progress.steps.find(step => step.id === 'send')?.label).toBe('Send and record shipments')
    expect(progress.steps.find(step => step.id === 'send')?.state).toBe('in-progress')
    expect(progress.steps.find(step => step.id === 'tubes')?.state).toBe('in-progress')
    expect(progress.steps.find(step => step.id === 'send')?.detail).toContain('1 shipment recorded as sent')
  })

  it('does not complete a family from one selected shipment or a paginated sample subset', () => {
    const selectedOnly = build({ shipments: [shipment(1, { shippedAt: recordedAt })] })
    expect(selectedOnly.allSent).toBe(false)
    expect(selectedOnly.shipmentCount).toBeNull()
    expect(selectedOnly.steps.find(step => step.id === 'send')?.label).toBe('Send and record shipments')
    const progress = build({ order: { ...order, samples: order.samples.slice(0, 1) } })
    expect(progress.steps.find(step => step.id === 'containers')?.state).toBe('unavailable')
    expect(progress.steps.find(step => step.id === 'tubes')?.detail).toContain('count is not available')
    expect(progress.allSent).toBe(false)
    expect(progress.shipmentCount).toBeNull()
  })

  it('uses singular instructions only when one container holds the entire required tube list', () => {
    const entireOrder = shipment(1, { crosswalk: [shipment(1), shipment(2)].flatMap(value => value.crosswalk), expectedTubeCount: 4 })
    const progress = build({ shipments: [entireOrder] })
    expect(progress.shipmentCount).toBe(1)
    expect(progress.nextStep).toMatchObject({ id: 'send', label: 'Send and record your shipment' })
    expect(progress.nextStep?.detail).toBe('Your shipment has not been recorded as sent. Print the current shipping insert and place it inside the container, then hand the shipment to the carrier and record it here.')
    expect(progress.steps.map(step => step.id)).not.toContain('insert')
    const unconfirmed = build({ shipments: [{ ...entireOrder, currentPacket: null }] })
    expect(unconfirmed.nextStep).toMatchObject({ id: 'send', state: 'waiting-for-you', label: 'Send and record your shipment' })
    expect(unconfirmed.nextStep?.detail).toContain('Review and confirm the shipping insert, then print it and place it inside the container.')
    const sent = build({ shipments: [{ ...entireOrder, shippedAt: recordedAt }] })
    expect(sent.allSent).toBe(true)
    expect(sent.shipmentCount).toBe(1)
    expect(sent.steps.find(step => step.id === 'send')?.detail).toBe('Your shipment is recorded as sent. Track receipt and laboratory progress below.')
  })

  it('requires unique saved matches before Send and guides confirmation of every current nonvoid insert within Send', () => {
    const first = shipment(1)
    const second = shipment(2)
    const unmatched = { ...second, crosswalk: second.crosswalk.map(row => ({ ...row, supplierTubeBarcode: null })) }
    expect(find('tubes', { shipments: [first, unmatched] }).detail).toContain('2 of 4 tubes matched')
    expect(find('tubes', { shipments: [first, unmatched] }).state).not.toBe('complete')
    expect(find('tubes', { shipments: [first, unmatched] }).state).toBe('in-progress')
    expect(find('send', { shipments: [first, unmatched] }).state).toBe('in-progress')
    expect(find('send', { shipments: [{ ...first, currentPacket: null }, { ...unmatched, currentPacket: null }] }).state).toBe('not-started')
    const duplicate = { ...second, crosswalk: [{ ...second.crosswalk[0], registeredSampleTubeId: first.crosswalk[0].registeredSampleTubeId }, second.crosswalk[1]] }
    expect(find('tubes', { shipments: [first, duplicate] }).state).toBe('needs-attention')
    const awaitingInsert = build({ shipments: [first, { ...second, currentPacket: null }] })
    expect(awaitingInsert.nextStep).toMatchObject({ id: 'send', state: 'in-progress' })
    expect(awaitingInsert.nextStep?.detail).toContain('1 of 2 shipping inserts confirmed. Review and confirm the remaining shipping inserts')
    expect(find('send', { shipments: [first, { ...second, currentPacket: { ...second.currentPacket!, isVoided: true } }] }).detail).toContain('1 of 2 shipping inserts confirmed')
    expect(find('send', { shipments: [first, { ...second, currentPacket: { ...second.currentPacket!, revision: 2 } }] }).detail).toContain('Print each current shipping insert')
    expect(find('send').state).not.toBe('complete')
  })

  it('rejects contradictory counts and repeated slot identities instead of inflating progress', () => {
    expect(find('containers', { shipments: [shipment(1), shipment(2, { expectedTubeCount: 7 })] }).state).toBe('needs-attention')
    expect(build({ shipments: [shipment(1), shipment(2, { orderExpectedTubeCount: 99, shippedAt: recordedAt })] }).allSent).toBe(false)
    const duplicateSlot = shipment(2)
    duplicateSlot.crosswalk[0] = { ...duplicateSlot.crosswalk[0], tubeSlotId: shipment(1).crosswalk[0].tubeSlotId }
    expect(find('containers', { shipments: [shipment(1), duplicateSlot] }).state).toBe('needs-attention')
  })

  it.each(['loading', 'unavailable'] as const)('does not turn %s shipping data into zeroes or completion, even with cached dispatched rows', shippingState => {
    const progress = build({ shippingState, shipments: [shipment(1, { shippedAt: recordedAt }), shipment(2, { shippedAt: recordedAt })] })
    expect(progress.allSent).toBe(false)
    expect(progress.shipmentCount).toBeNull()
    expect(progress.steps.slice(2).every(step => step.state === 'unavailable' && !step.detail.includes('0'))).toBe(true)
    expect(progress.steps.slice(0, 2).every(step => step.state === 'complete')).toBe(true)
  })

  it('does not complete an empty or unrelated shipment family', () => {
    expect(build({ shipments: [] }).allSent).toBe(false)
    expect(find('kits', { shipments: [] }).state).toBe('unavailable')
    expect(build({ shipments: [shipment(1, { organizationId: 'other', shippedAt: recordedAt }), shipment(2, { authorizationSourceId: 'other', shippedAt: recordedAt })] }).allSent).toBe(false)
    expect(build({ shipments: [shipment(1, { authorizationSource: 'ProspectTrialProject', shippedAt: recordedAt }), shipment(2, { authorizationSource: 'ProspectTrialProject', shippedAt: recordedAt })] }).allSent).toBe(false)
  })

  it('preserves legacy promotional shipments linked to this Lab Job', () => {
    const shipments = [1, 2].map(index => shipment(index, { authorizationSource: 'CustomerPromotionalOrder', shippedAt: recordedAt }))
    expect(build({ shipments }).allSent).toBe(true)
    expect(find('tubes', { shipments }).state).toBe('complete')
  })

  it('requires every active shipment to have actual dispatch evidence and preserves that fact independently of insert availability', () => {
    expect(build({ shipments: [shipment(1, { status: 'Shipped' }), shipment(2, { status: 'Received' })] }).allSent).toBe(false)
    const progress = build({ shipments: [shipment(1, { shippedAt: recordedAt }), shipment(2, { shippedAt: recordedAt, currentPacket: null })] })
    expect(progress.allSent).toBe(true)
    expect(progress.nextStep).toBeNull()
    expect(progress.steps.find(step => step.id === 'send')?.state).toBe('complete')
    expect(progress.steps.find(step => step.id === 'send')?.detail).toContain('Track receipt and laboratory progress below')
  })

  it('checks kit availability rather than marking a mandatory kit order complete', () => {
    expect(find('kits', { shipments: [pool()] }).detail).toContain('Check available kits')
    expect(find('kits', { shipments: [pool()] }).state).not.toBe('complete')
    expect(find('kits', { shipments: [pool()], kitSupply: supply() }).state).toBe('complete')
    expect(find('kits', { shipments: [pool()], kitSupply: supply({ canPrepareSamples: false }), canManageShipping: false }).state).toBe('complete')
    for (const invalid of [{ inventoryStatus: 'Unknown' as const }, { shipmentVersion: 2 }, { jobId: 'other' }, { recordedStock: [] }]) {
      expect(find('kits', { shipments: [pool()], kitSupply: supply(invalid) }).state).not.toBe('complete')
    }
    const secondPool = { ...pool(), id: 'other-pool', crosswalk: shipment(2).crosswalk, expectedTubeCount: 2 }
    const firstPool = { ...pool(), crosswalk: shipment(1).crosswalk, expectedTubeCount: 2 }
    expect(find('kits', { shipments: [firstPool, secondPool], kitSupply: supply({ tubeCount: 2 }) }).state).not.toBe('complete')
  })

  it('distinguishes outbound kit delivery from sample dispatch and preserves member ownership', () => {
    const request = { status: 'Dispatched', canConfirmReceipt: false } as NonNullable<ShipmentKitSupply['request']>
    const kitSupply = supply({ inventoryStatus: 'Unknown', request })
    expect(find('kits', { shipments: [pool()], kitSupply })).toMatchObject({ state: 'waiting-for-delivery', owner: 'Carrier' })
    expect(build({ shipments: [pool()], kitSupply }).allSent).toBe(false)
    expect(find('kits', { shipments: [pool()], canManageShipping: false, kitSupply: { ...kitSupply, request: { ...request, canConfirmReceipt: true } } })).toMatchObject({ state: 'waiting-for-administrator', owner: 'Your administrator' })
  })

  it.each(['OnHold', 'CancellationRequested', 'Cancelled', 'Declined', 'Completed'])('preserves saved facts and avoids directing happy-path work during %s', status => {
    const progress = build({ order: { ...order, status, tenantSafeReason: status === 'OnHold' ? 'Please contact Phaeno.' : null } })
    expect(progress.exception).not.toBeNull()
    expect(progress.nextStep).toBeNull()
    expect(progress.steps.find(step => step.id === 'confirm-order')?.state).toBe('complete')
    expect(progress.steps.find(step => step.id === 'send')?.state).not.toBe('complete')
    expect(progress.allSent).toBe(false)
  })
})
