import type { LabServiceOrder } from '#/api/order-management'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'

const recorded = (value: string | null | undefined) => Boolean(value && Number.isFinite(Date.parse(value)))
const labWorkStarted = new Set(['Received', 'OnHold', 'Processing', 'AwaitingExternalSequencing', 'DataProcessing', 'ScientificReview', 'ReadyForRelease'])

export function labJobVisibility(order: LabServiceOrder, shipments: SampleShipmentWorkflow[], hasResultPackages: boolean) {
  const confirmed = recorded(order.placedAt) || order.quotes.some(quote => quote.status === 'Accepted' || recorded(quote.acceptedAt))
  const family = shipments.filter(shipment => shipment.authorizationSourceId === order.id && shipment.organizationId === order.organizationId && shipment.status !== 'Cancelled')
  const trackingRelevant = family.some(shipment => recorded(shipment.shippedAt) || (shipment.receivedTubeCount ?? 0) > 0 || (shipment.orderReceivedTubeCount ?? 0) > 0)
    || order.samples.some(sample => recorded(sample.customerShippedAt) || recorded(sample.receivedAt) || Boolean(sample.accessionId))
    || labWorkStarted.has(order.labMilestone ?? '') || order.labReadyForRelease === true
    || hasResultPackages || order.resultFiles.length > 0 || order.resultReleases.some(release => recorded(release.releasedAt))
  return {
    confirmed,
    // Keep historical/legacy samples available for review or repair.
    samplesRelevant: confirmed || order.canEditSamples || recorded(order.sampleRosterFinalizedAt) || order.samples.length > 0,
    trackingRelevant,
  }
}
