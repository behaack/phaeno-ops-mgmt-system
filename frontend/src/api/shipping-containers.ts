import { api } from './client'
import type { SampleShipmentWorkflow } from './sample-shipping'

type Envelope<T> = { success: boolean; data: T; error: { code: string; message: string } | null }

export type ContainerCompatibility = { sampleTypeDefinitionId: string; instructionRuleId: string }
export type ShippingContainerDefinition = {
  id: string
  definitionKey: string
  sku: string
  commonName: string
  tubeCapacity: number
  revision: number
  supersedesDefinitionId: string | null
  supplierName: string | null
  supplierProductNumber: string | null
  packingInstructions: string | null
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  deactivatedAt: string | null
  displayOrder: number
  version: number
  compatibilities: ContainerCompatibility[]
}
export type ShippingContainerWrite = Pick<ShippingContainerDefinition,
  'commonName' | 'tubeCapacity' | 'supplierName' | 'supplierProductNumber' | 'packingInstructions' |
  'effectiveFrom' | 'effectiveTo' | 'isActive' | 'displayOrder' | 'compatibilities'>
export type ContainerQuantity = { containerDefinitionId: string; quantity: number }
export type ContainerRecommendationRequest = {
  tubeCount: number
  contexts: ContainerCompatibility[]
  availability?: ContainerQuantity[]
  selection?: ContainerQuantity[]
  includeDraftDefinitionId?: string
}
export type ContainerRecommendation = {
  tubeCount: number
  containerCount: number
  totalCapacity: number
  unusedCapacity: number
  unallocatedTubes: number
  isComplete: boolean
  containers: Array<{
    containerDefinitionId: string
    sku: string
    commonName: string
    capacity: number
    quantity: number
    assignedTubes: number
    unusedCapacity: number
  }>
  explanation: string
}

const catalogPath = '/platform/sample-shipping/container-types'
function read<T>(response: Envelope<T>): T {
  if (!response.success) throw new Error(response.error?.message ?? 'The shipping-container request could not be completed.')
  return response.data
}
export async function getShippingContainerDefinitions() {
  return read((await api.get<Envelope<ShippingContainerDefinition[]>>(catalogPath)).data)
}
export async function getShippingContainerDefinition(id: string) {
  return read((await api.get<Envelope<ShippingContainerDefinition>>(`${catalogPath}/${id}`)).data)
}
export async function getShippingContainerRevisions(id: string) {
  return read((await api.get<Envelope<ShippingContainerDefinition[]>>(`${catalogPath}/${id}/revisions`)).data)
}
export async function createShippingContainerDefinition(input: ShippingContainerWrite & { sku: string }) {
  return read((await api.post<Envelope<ShippingContainerDefinition>>(catalogPath, input)).data)
}
export async function reviseShippingContainerDefinition(id: string, input: ShippingContainerWrite & { version: number }) {
  return read((await api.post<Envelope<ShippingContainerDefinition>>(`${catalogPath}/${id}/revisions`, input)).data)
}
export async function deactivateShippingContainerDefinition(id: string, version: number) {
  return read((await api.post<Envelope<ShippingContainerDefinition>>(`${catalogPath}/${id}/deactivate`, { version })).data)
}
export async function previewContainerRecommendation(input: ContainerRecommendationRequest) {
  return read((await api.post<Envelope<ContainerRecommendation>>(`${catalogPath}/recommendation`, input)).data)
}

export type ShippingStockKit = {
  id: string
  kitNumber: string
  container: { definitionId: string; sku: string; commonName: string; capacity: number }
  tubeSupplierName: string
  tubeProductNumber: string
  tubeLotNumber: string | null
  shipperSupplierName: string
  shipperProductNumber: string
  status: 'Preparing' | 'OnTheWay' | 'Available' | 'Assigned' | 'InUse' | 'NeedsReview' | 'Fulfilled' | 'Bound'
  organizationId: string | null
  authorizationSourceId: string | null
  authorizationReference: string | null
  boundSampleShipmentId: string | null
  outboundCarrier: string | null
  outboundTrackingNumber: string | null
  fulfilledAt: string | null
  departmentId?: string | null
  deliveryLocationId?: string | null
  deliveryLocationLabel?: string | null
  transportationKitRequestId?: string | null
  originatingJobId?: string | null
  originatingJobNumber?: string | null
  customerReceivedAt?: string | null
  reservedSampleShipmentId?: string | null
  assignedJobId?: string | null
  assignedJobNumber?: string | null
  organizationName?: string | null
  departmentName?: string | null
  inventoryBlockedReason?: string | null
  version: number
  tubes: Array<{ id: string; supplierBarcode: string }>
}
export type ShippingStockKitWrite = Pick<ShippingStockKit, 'tubeSupplierName' | 'tubeProductNumber' | 'tubeLotNumber' | 'shipperSupplierName' | 'shipperProductNumber'> & { containerDefinitionId: string }
export type ShippingStockKitDispatch = { shipmentId?: string; requestId?: string; deliveryLocationId?: string; version: number; outboundCarrier: string; outboundTrackingNumber: string; fulfilledAt: string }
const stockPath = '/platform/sample-shipping/stock-kits'
export async function getShippingStockKits() { return read((await api.get<Envelope<ShippingStockKit[]>>(stockPath)).data) }
export async function getShippingStockKit(id: string) { return read((await api.get<Envelope<ShippingStockKit>>(`${stockPath}/${id}`)).data) }
export async function createShippingStockKit(input: ShippingStockKitWrite) { return read((await api.post<Envelope<ShippingStockKit>>(stockPath, input)).data) }
export async function registerShippingStockKitTubes(id: string, input: { supplierBarcodes: string[]; version: number }) { return read((await api.post<Envelope<ShippingStockKit>>(`${stockPath}/${id}/tubes`, input)).data) }
export async function dispatchShippingStockKit(id: string, input: ShippingStockKitDispatch) { return read((await api.post<Envelope<ShippingStockKit>>(`${stockPath}/${id}/dispatch`, input)).data) }

export type ShippingIdentityLookup = { kind: 'Order' | 'Sample' | 'Shipment'; id: string; reference: string; shipments: SampleShipmentWorkflow[] }
export async function scanShippingIdentity(barcode: string) { return read((await api.get<Envelope<ShippingIdentityLookup>>('/platform/sample-shipping/identities/scan', { params: { barcode } })).data) }

