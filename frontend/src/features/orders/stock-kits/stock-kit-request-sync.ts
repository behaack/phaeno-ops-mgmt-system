import type { QueryClient } from '@tanstack/react-query'
import type { ShippingStockKit } from '#/api/shipping-containers'
import type { TransportationKitRequest } from '#/api/transportation-kit-requests'

export function matchingUnlinkedKitRequest(kit: ShippingStockKit, requests: TransportationKitRequest[]) {
  const originJobId = kit.originatingJobId ?? kit.authorizationSourceId
  if (kit.status === 'Preparing' || kit.transportationKitRequestId || kit.boundSampleShipmentId || kit.reservedSampleShipmentId || !originJobId || !kit.organizationId
    || !kit.outboundCarrier || !kit.outboundTrackingNumber || !kit.fulfilledAt
    || !Number.isFinite(new Date(kit.fulfilledAt).getTime())
    || requests.some(request => request.kits.some(value => value.stockKitId === kit.id))) return null
  const matches = requests.filter(request => request.jobId === originJobId
    && request.organizationId === kit.organizationId
    && (!kit.departmentId || request.departmentId === kit.departmentId)
    && (!kit.deliveryLocationId || request.deliveryLocationId === kit.deliveryLocationId)
    && ['Pending', 'PartiallyDispatched'].includes(request.status)
    && request.lines.some(line => line.containerDefinitionId === kit.container.definitionId
      && line.dispatchedQuantity < line.requestedQuantity))
  return matches.length === 1 ? matches[0] : null
}

export async function refreshStockKitSupply(client: QueryClient) {
  await Promise.all([
    'shipping-stock-kit', 'shipping-stock-kits',
    'platform-transportation-kit-request', 'platform-transportation-kit-requests',
    'transportation-kit-supply', 'transportation-kit-order-preview',
    'location-kit-inventory',
    'sample-shipping-workflow', 'platform-sample-shipments', 'sample-shipments',
    'sample-shipment', 'sample-shipment-packing', 'lab-service-order', 'lab-service-orders',
    'platform-order', 'platform-orders',
  ].map(key => client.invalidateQueries({ queryKey: [key] })))
}
