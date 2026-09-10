import type { LabServiceOrder, Quote } from '#/api/order-management'
import type { SampleShipmentWorkflow, SampleShippingCrosswalkItem } from '#/api/sample-shipping'
import type { ShipmentKitSupply } from '#/api/transportation-kit-requests'

export type LabJobProgressStepId = 'confirm-order' | 'samples' | 'kits' | 'containers' | 'tubes' | 'send'
export type LabJobProgressState = 'not-started' | 'complete' | 'in-progress' | 'waiting-for-you' | 'waiting-for-administrator' | 'waiting-for-phaeno' | 'waiting-for-delivery' | 'needs-attention' | 'unavailable'
export type LabJobProgressOwner = 'You' | 'Your administrator' | 'Phaeno' | 'Carrier'
export type LabJobProgressStep = {
  id: LabJobProgressStepId
  label: string
  state: LabJobProgressState
  owner: LabJobProgressOwner
  detail: string
}
export type LabJobProgressException = { label: string; detail: string; owner: LabJobProgressOwner }
export type LabJobProgress = {
  steps: LabJobProgressStep[]
  nextStep: LabJobProgressStep | null
  allSent: boolean
  /** Null until the full required tube list is allocated without a remaining pool. */
  shipmentCount: number | null
  exception: LabJobProgressException | null
}
export type LabJobProgressInput = {
  order: LabServiceOrder
  /** The complete source-family response, before any visible list pagination. */
  shipments: SampleShipmentWorkflow[]
  shippingState: 'loading' | 'unavailable' | 'ready'
  canManageShipping: boolean
  canAcceptOrder: boolean
  kitSupply?: ShipmentKitSupply
  now?: number
}

export const labJobProgressStateLabels: Record<LabJobProgressState, string> = {
  'not-started': 'Not started', complete: 'Complete', 'in-progress': 'In progress',
  'waiting-for-you': 'Waiting for you', 'waiting-for-administrator': 'Waiting for your administrator',
  'waiting-for-phaeno': 'Waiting for Phaeno', 'waiting-for-delivery': 'Waiting for delivery',
  'needs-attention': 'Needs attention', unavailable: 'Not available',
}

const labels: Record<LabJobProgressStepId, string> = {
  'confirm-order': 'Review and confirm the order', samples: 'Enter and finalize samples',
  kits: 'Have transportation kits ready', containers: 'Assign containers', tubes: 'Match tubes',
  send: 'Send and record shipments',
}
const hasDate = (value: string | null | undefined) => !!value && Number.isFinite(Date.parse(value))
const positiveInteger = (value: number | undefined): value is number => Number.isInteger(value) && value! > 0
const present = (value: string | null | undefined) => !!value?.trim()
const customerOwner = (allowed: boolean): LabJobProgressOwner => allowed ? 'You' : 'Your administrator'
const customerState = (allowed: boolean): LabJobProgressState => allowed ? 'waiting-for-you' : 'waiting-for-administrator'
const count = (value: number, singular: string) => `${value} ${singular}${value === 1 ? '' : 's'}`

/** Display evidence only. The existing server-backed commands still decide whether a write is allowed. */
export function buildLabJobProgress(input: LabJobProgressInput): LabJobProgress {
  const { order, shippingState, canManageShipping, canAcceptOrder } = input
  const owner = customerOwner(canManageShipping)
  const readyState = customerState(canManageShipping)
  const step = (id: LabJobProgressStepId, state: LabJobProgressState, detail: string, stepOwner = owner): LabJobProgressStep => ({ id, label: labels[id], state, owner: stepOwner, detail })
  const accepted = hasDate(order.placedAt) || order.quotes.some(quote => quote.status === 'Accepted' || hasDate(quote.acceptedAt))
  const finalized = hasDate(order.sampleRosterFinalizedAt)
  const samples = order.samples
  const expected = expectedTubes(order)
  const sampleCountKnown = Number.isInteger(order.requestedSpecimenCount) && order.requestedSpecimenCount > 0
  const sampleDetail = sampleCountKnown ? `${samples.length} of ${order.requestedSpecimenCount} samples entered.` : 'The accepted sample count is not available.'
  const steps = [
    confirmationStep(order, accepted, canAcceptOrder, input.now ?? Date.now()),
    step('samples', finalized ? 'complete' : !accepted ? 'not-started' : readyState,
      finalized ? `Sample list finalized.${expected === null ? ' The required tube count is not available.' : ` ${count(samples.length, 'sample')} · ${count(expected, 'tube')}.`}`
        : !accepted ? `${sampleDetail} Confirm the order before finalizing the sample list.`
          : `${sampleDetail} ${canManageShipping ? 'Enter the agreed samples and finalize the list.' : 'Your administrator can enter and finalize the sample list.'}`),
  ]
  const exception = orderException(order)

  if (shippingState !== 'ready') {
    const detail = shippingState === 'loading' ? 'Checking shipping progress…' : 'Shipping progress is not available. Refresh or ask Phaeno for help.'
    for (const id of ['kits', 'containers', 'tubes', 'send'] as const) steps.push(step(id, 'unavailable', detail))
    return finish(steps, false, exception)
  }

  const family = input.shipments.filter(shipment => shipment.organizationId === order.organizationId
    && (shipment.authorizationSource === 'CustomerLabServiceOrder' || shipment.authorizationSource === 'CustomerPromotionalOrder')
    && shipment.authorizationSourceId === order.id && shipment.status !== 'Cancelled')
  const active = family.filter(shipment => shipment.crosswalk.length > 0 || positiveInteger(shipment.expectedTubeCount))
  const pools = active.filter(isUnallocated)
  const containers = active.filter(shipment => !isUnallocated(shipment))
  const rows = active.flatMap(shipment => shipment.crosswalk)
  const countsAgree = expected !== null && active.every(shipment => shipment.orderExpectedTubeCount === undefined || shipment.orderExpectedTubeCount === expected)
    && active.every(shipment => shipment.expectedTubeCount === undefined || shipment.expectedTubeCount === shipment.crosswalk.length)
  const knownSlots = countsAgree && completeRosterCoverage(order, rows)
  const assigned = containers.filter(hasAssignedKit)
  const allocatedTubes = assigned.reduce((total, shipment) => total + shipment.crosswalk.length, 0)
  const fullyAllocatedScope = knownSlots && pools.length === 0 && containers.length > 0
  const shipmentCount = fullyAllocatedScope ? containers.length : null
  const singleShipment = shipmentCount === 1
  const allAllocated = fullyAllocatedScope && assigned.length === containers.length
  const matched = rows.filter(isMatched)
  const uniqueMatches = new Set(matched.map(row => row.registeredSampleTubeId)).size === matched.length
    && new Set(matched.map(row => row.supplierTubeBarcode!.trim())).size === matched.length
  const allMatched = fullyAllocatedScope && matched.length === expected && uniqueMatches
  const issued = containers.filter(shipment => hasCurrentInsert(shipment))
  const insertsComplete = fullyAllocatedScope && issued.length === containers.length
  const sent = containers.filter(shipment => hasDate(shipment.shippedAt))
  const allSent = fullyAllocatedScope && sent.length === containers.length
  const knownCount = (value: number) => expected === null || !countsAgree ? 'The required tube count is not available.' : `${value} of ${expected} tubes`
  const supply = currentSupply(input.kitSupply, order, active)
  const kitsComplete = knownSlots && active.length > 0
    && active.every(shipment => hasAssignedKit(shipment) || (shipment.id === supply?.shipmentId && hasAvailableSupply(supply, shipment)))

  steps.push(kitStep({ step, finalized, active, supply, complete: kitsComplete, readyState, owner }))
  steps.push(step('containers', allAllocated ? 'complete' : !finalized ? 'not-started' : expected === null ? 'unavailable' : !countsAgree || !knownSlots && rows.length > 0 ? 'needs-attention' : readyState,
    allAllocated ? `${count(containers.length, 'container')} assigned for all ${count(expected!, 'tube')}.`
      : !finalized ? 'Finalize the sample list before assigning containers.'
        : !countsAgree || !knownSlots && rows.length > 0 ? 'Container totals need review. Open the shipping workspace to check the complete sample list.'
          : `${knownCount(allocatedTubes)}${expected !== null && countsAgree ? ' allocated.' : ''} Assign the remaining tubes to physical containers.`))
  steps.push(step('tubes', allMatched ? 'complete' : !uniqueMatches ? 'needs-attention' : matched.length > 0 ? 'in-progress' : !allAllocated ? 'not-started' : readyState,
    allMatched ? `All ${count(expected!, 'tube')} have saved barcode matches.`
      : !uniqueMatches ? 'A tube match appears more than once. Review the affected containers.'
        : `${knownCount(matched.length)}${expected !== null && countsAgree ? ' matched.' : ''} ${allAllocated ? 'Scan each remaining registered tube.' : 'Finish assigning containers before matching the remaining tubes.'}`))
  const singleSendGuidance = !allMatched
    ? 'Complete the tube matches before preparing the shipping insert and sending the shipment.'
    : insertsComplete ? 'Print the current shipping insert and place it inside the container, then hand the shipment to the carrier and record it here.'
      : 'Review and confirm the shipping insert, then print it and place it inside the container. Hand the shipment to the carrier and record it here.'
  const multipleSendGuidance = !allMatched
    ? 'Finish assigning containers and matching their tubes before preparing shipping inserts and sending them.'
    : insertsComplete ? 'Print each current shipping insert and place it inside its container, then hand each shipment to the carrier and record it here.'
      : `${issued.length} of ${shipmentCount} shipping inserts confirmed. Review and confirm the remaining shipping inserts, then print each current insert and place it inside its container. Hand each shipment to the carrier and record it here.`
  const sendDetail = singleShipment
    ? allSent ? 'Your shipment is recorded as sent. Track receipt and laboratory progress below.'
      : `Your shipment has not been recorded as sent. ${singleSendGuidance}`
    : allSent ? `All ${count(containers.length, 'shipment')} recorded as sent. Track receipt and laboratory progress below.`
      : `${shipmentCount === null ? `${count(sent.length, 'shipment')} recorded as sent; the final shipment count is not yet confirmed` : `${sent.length} of ${shipmentCount} shipments recorded as sent`}. ${multipleSendGuidance}`
  steps.push({ ...step('send', allSent ? 'complete' : sent.length > 0 || issued.length > 0 ? 'in-progress' : !allMatched ? 'not-started' : readyState, sendDetail),
    label: singleShipment ? 'Send and record your shipment' : labels.send })
  return finish(steps, allSent, exception, shipmentCount)
}

function confirmationStep(order: LabServiceOrder, accepted: boolean, allowed: boolean, now: number): LabJobProgressStep {
  const base = { id: 'confirm-order' as const, label: labels['confirm-order'] }
  if (accepted) return { ...base, state: 'complete', owner: customerOwner(allowed), detail: 'The order is confirmed.' }
  const current = currentQuote(order.quotes)
  const expired = current?.status === 'Expired' || current?.status === 'Issued' && hasDate(current.expiresAt) && Date.parse(current.expiresAt) <= now
  if (expired) return { ...base, state: 'waiting-for-phaeno', owner: 'Phaeno', detail: 'The quote has expired. Ask Phaeno to provide a current quote before confirming the order.' }
  if (order.canPlaceStandardOrder || current?.status === 'Issued') {
    if (allowed && !order.canPlaceStandardOrder && !order.canAcceptQuote) return { ...base, state: 'needs-attention', owner: 'You', detail: order.quoteAcceptanceBlockedReason?.trim() || 'Review the order or quote blockers before accepting.' }
    return { ...base, state: customerState(allowed), owner: customerOwner(allowed), detail: allowed ? 'Review the current order or quote, then confirm it.' : 'Your administrator can review and confirm the current order or quote.' }
  }
  if (['SubmittedForQuote', 'QuoteInPreparation', 'QuoteIssued'].includes(order.status)) {
    return { ...base, state: 'waiting-for-phaeno', owner: 'Phaeno', detail: order.quoteAcceptanceBlockedReason || 'Phaeno is preparing or updating the quote. Submitting a request does not confirm the order.' }
  }
  const canPrepareOrder = allowed || order.canEdit || order.canSubmit
  return { ...base, state: customerState(canPrepareOrder), owner: customerOwner(canPrepareOrder), detail: order.status === 'ChangesRequested' ? 'Review the requested changes and resubmit the order for pricing.' : 'Complete the order details and submit for pricing, or review the configured standard order.' }
}

function currentQuote(quotes: Quote[]) {
  const published = quotes.filter(quote => ['Issued', 'Expired', 'Accepted'].includes(quote.status))
  return (published.length ? published : quotes).reduce<Quote | null>((latest, quote) => !latest || quote.revision > latest.revision ? quote : latest, null)
}

function expectedTubes(order: LabServiceOrder) {
  if (!positiveInteger(order.requestedSpecimenCount) || order.samples.length !== order.requestedSpecimenCount
    || !order.samples.every(sample => positiveInteger(sample.quantity))
    || new Set(order.samples.map(sample => sample.id)).size !== order.samples.length) return null
  return order.samples.reduce((total, sample) => total + sample.quantity, 0)
}

function completeRosterCoverage(order: LabServiceOrder, rows: SampleShippingCrosswalkItem[]) {
  if (expectedTubes(order) === null) return false
  // Tube ordinals repeat across split shipments; the persisted slot (or legacy item) identity does not.
  const keys = rows.map(row => row.tubeSlotId || (row.shipmentItemId && `${row.shipmentItemId}:${row.tubeOrdinal ?? 1}`))
  if (keys.some(key => !key) || new Set(keys).size !== keys.length) return false
  const bySample = new Map<string, number>()
  rows.forEach(row => bySample.set(row.submittedSpecimenId, (bySample.get(row.submittedSpecimenId) ?? 0) + 1))
  return bySample.size === order.samples.length && order.samples.every(sample => bySample.get(sample.id) === sample.quantity)
}

function isUnallocated(shipment: SampleShipmentWorkflow) {
  return shipment.isPackingPool === true || (!shipment.container && !shipment.returnKit && shipment.status === 'Preparing')
}

function hasAssignedKit(shipment: SampleShipmentWorkflow) {
  if (isUnallocated(shipment) || !shipment.crosswalk.length) return false
  const assigned = shipment.assignedContainer
  const physical = assigned && present(assigned.stockKitId) && ['Assigned', 'InUse'].includes(assigned.status)
    && (!assigned.assignedJobId || assigned.assignedJobId === shipment.authorizationSourceId)
    && (!assigned.reservedShipmentId || assigned.reservedShipmentId === shipment.id)
    && (!assigned.boundShipmentId || assigned.boundShipmentId === shipment.id)
    && assigned.container.definitionId === shipment.container?.definitionId && assigned.container.capacity >= shipment.crosswalk.length
  const legacy = shipment.returnKit && shipment.returnKit.sampleShipmentId === shipment.id && hasDate(shipment.returnKit.fulfilledAt)
    && shipment.returnKit.requiredTubeCount >= shipment.crosswalk.length
  return !!physical || !!legacy
}

function isMatched(row: SampleShippingCrosswalkItem) { return present(row.registeredSampleTubeId) && present(row.supplierTubeBarcode) }
function hasCurrentInsert(shipment: SampleShipmentWorkflow) {
  const insert = shipment.currentPacket
  return !!insert && present(insert.id) && positiveInteger(insert.revision) && hasDate(insert.issuedAt) && insert.isVoided === false
}

function currentSupply(supply: ShipmentKitSupply | undefined, order: LabServiceOrder, active: SampleShipmentWorkflow[]) {
  if (!supply || supply.jobId !== order.id || !supply.deliveryLocationId) return undefined
  const shipment = active.find(value => value.id === supply.shipmentId)
  return shipment && supply.shipmentVersion === shipment.version && supply.tubeCount === shipment.crosswalk.length
    && (!shipment.departureDeliveryLocationId || shipment.departureDeliveryLocationId === supply.deliveryLocationId) ? supply : undefined
}

function hasAvailableSupply(supply: ShipmentKitSupply, shipment: SampleShipmentWorkflow) {
  // This recommendation covers the shortage AFTER received location stock, not the full tube list.
  const recommendation = supply.recommendation
  return supply.inventoryStatus === 'RecordedForLocation' && shipment.crosswalk.length > 0 && recommendation.isComplete
    && recommendation.tubeCount === 0 && recommendation.unallocatedTubes === 0 && recommendation.containerCount === 0
    && recommendation.containers.length === 0 && supply.recordedStock.some(stock => stock.availableQuantity > 0)
}

function kitStep({ step, finalized, active, supply, complete, readyState, owner }: {
  step: (id: LabJobProgressStepId, state: LabJobProgressState, detail: string, owner?: LabJobProgressOwner) => LabJobProgressStep
  finalized: boolean; active: SampleShipmentWorkflow[]; supply: ShipmentKitSupply | undefined; complete: boolean
  readyState: LabJobProgressState; owner: LabJobProgressOwner
}) {
  if (complete) return step('kits', 'complete', 'Transportation kits are assigned or sufficient compatible received stock is available for every required container.')
  if (!finalized) return step('kits', 'not-started', 'Finalize the samples to check which transportation kits are needed.')
  if (!active.length) return step('kits', 'unavailable', 'Shipping setup is not available yet. Ask Phaeno to check this Job.', 'Phaeno')
  const request = supply?.request
  if (request && request.status !== 'Cancelled' && request.status !== 'Received') {
    if (request.canConfirmReceipt) return step('kits', readyState, 'Kits are on the way. Confirm receipt only after they physically arrive at the departure location.', owner)
    if (request.status === 'Dispatched') return step('kits', 'waiting-for-delivery', 'Transportation kits are on the way to your departure location. Their delivery is separate from sending your samples.', 'Carrier')
    return step('kits', 'waiting-for-phaeno', 'Phaeno is preparing the remaining transportation kits. Existing compatible stock may also be available at your departure location.', 'Phaeno')
  }
  return step('kits', readyState, 'Check available kits at your departure location. Use compatible received stock, or request the kits you still need.')
}

function orderException(order: LabServiceOrder): LabJobProgressException | null {
  const reason = order.tenantSafeReason?.trim()
  if (order.status === 'Cancelled' || order.status === 'Declined') return { label: order.status === 'Cancelled' ? 'Order cancelled' : 'Order declined', owner: 'Phaeno', detail: reason || 'This order is not proceeding. Earlier recorded preparation remains visible; unfinished steps are not complete.' }
  if (order.status === 'CancellationRequested') return { label: 'Cancellation requested', owner: 'Phaeno', detail: reason || 'Phaeno is reviewing the cancellation request. Check with Phaeno before sending further samples.' }
  if (order.status === 'OnHold') return { label: 'Order on hold', owner: 'Phaeno', detail: reason || 'Review the hold details with Phaeno before continuing. Previously completed preparation remains recorded.' }
  if (order.status === 'Completed') return { label: 'Order completed', owner: 'Phaeno', detail: 'Review laboratory progress and results below. Preparation is checked off only where its saved evidence is available.' }
  return null
}

function finish(steps: LabJobProgressStep[], allSent: boolean, exception: LabJobProgressException | null, shipmentCount: number | null = null): LabJobProgress {
  if (exception || allSent) return { steps, nextStep: null, allSent, shipmentCount, exception }
  return { steps, nextStep: steps.find(step => step.state !== 'complete') ?? null, allSent, shipmentCount, exception }
}
