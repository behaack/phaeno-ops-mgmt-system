import type { SampleShipmentPacking, SampleShipmentWorkflow, SampleShippingCrosswalkItem } from '#/api/sample-shipping'
import type { ContainerRecommendation, ShippingContainerDefinition } from '#/api/shipping-containers'

export const shippingContainers: ShippingContainerDefinition[] = [20, 10, 5].map(capacity => ({
  id: `container-${capacity}`, definitionKey: `definition-${capacity}`, sku: `000-${capacity}`, commonName: `${capacity}-tube container`, tubeCapacity: capacity,
  revision: 1, supersedesDefinitionId: null, supplierName: null, supplierProductNumber: null, packingInstructions: null,
  effectiveFrom: '2026-01-01T00:00:00Z', effectiveTo: null, deactivatedAt: null, isActive: true, displayOrder: 0, version: 1, compatibilities: [],
}))
export const packingFixture: SampleShipmentPacking = { shipmentId: 'shipment-1', version: 3, tubeCount: 30, containerTypes: shippingContainers, canPack: true, blockedReason: null }
export const packingRecommendation: ContainerRecommendation = { tubeCount: 30, containerCount: 2, totalCapacity: 30, unusedCapacity: 0, unallocatedTubes: 0, isComplete: true, containers: [20, 10].map(capacity => ({ containerDefinitionId: `container-${capacity}`, sku: `000-${capacity}`, commonName: `${capacity}-tube container`, capacity, quantity: 1, assignedTubes: capacity, unusedCapacity: 0 })), explanation: 'Two containers hold all 30 tubes without spare capacity.' }
export function shippingTube(index: number, overrides: Partial<SampleShippingCrosswalkItem> = {}): SampleShippingCrosswalkItem {
  return { shipmentItemId: `item-${index}`, submittedSpecimenId: `sample-${index}`, customerSampleId: `RNA-${index}`, sampleName: `Extracted RNA ${index}`, sampleTypeName: 'Extracted RNA', quantity: 1, quantityUnit: 'tubes', registeredSampleTubeId: null, supplierTubeBarcode: null, tubeStatus: 'Expected', version: 1, tubeSlotId: `slot-${index}`, tubeOrdinal: 1, tubeCount: 1, totalSampleTubeCount: 1, ...overrides }
}
export const shippingFixture: SampleShipmentWorkflow = {
  id: 'shipment-1', shipmentNumber: 'SHIP-1', organizationId: 'org-1', organizationName: 'Synthetic Customer', authorizationSource: 'CustomerLabServiceOrder', authorizationSourceId: 'order-1', authorizationReference: 'JOB-1', authorizationName: 'Synthetic shipment', labWorkOrderId: 'lab-1', destinationId: 'destination-1', destinationName: 'Synthetic laboratory', status: 'Preparing', carrier: null, trackingNumber: null, shippedAt: null, version: 3, returnKit: null, currentPacket: null,
  container: { definitionId: 'container-20', sku: '000-20', commonName: '20-tube container', capacity: 20 }, isPackingPool: false, crosswalk: [shippingTube(1), shippingTube(2)],
}
