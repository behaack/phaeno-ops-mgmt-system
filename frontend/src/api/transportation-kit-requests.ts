import { api } from './client'
import type { CustomerDeliveryLocation } from './customer-delivery-locations'
import type { ContainerQuantity, ContainerRecommendation } from './shipping-containers'

type Envelope<T> = { success: boolean; data: T; error: { message: string } | null }
export type TransportationKitRequestLine = { id: string; containerDefinitionId: string; sku: string; commonName: string; tubeCapacity: number; requestedQuantity: number; dispatchedQuantity: number; receivedQuantity: number }
export type TransportationKitDispatch = { stockKitId: string; kitNumber: string; requestLineId: string; containerDefinitionId: string; outboundCarrier: string; outboundTrackingNumber: string; dispatchedAt: string; receivedAt: string | null }
export type TransportationKitRequest = {
  id: string; jobId: string; jobNumber: string; organizationId: string; organizationName: string; departmentId: string; departmentName: string; deliveryLocationId: string
  deliveryAddress: CustomerDeliveryLocation
  status: 'Pending' | 'PartiallyDispatched' | 'Dispatched' | 'Received' | 'Cancelled'
  requestedAt: string; version: number; includedInLabOrder: true
  lines: TransportationKitRequestLine[]; kits: TransportationKitDispatch[]
  canConfirmReceipt: boolean; canCancel: boolean; cancellationReason: string | null
}
export type ShipmentKitSupply = {
  shipmentId: string; shipmentVersion: number; jobId: string; jobNumber: string; tubeCount: number
  deliveryLocationId: string | null; locations: CustomerDeliveryLocation[]; recommendation: ContainerRecommendation
  recordedStock: Array<{ containerDefinitionId: string; availableQuantity: number; inTransitQuantity: number }>
  inventoryStatus: 'Unknown' | 'RecordedForThisJob'; request: TransportationKitRequest | null
  canRequestKits: boolean; requestBlockedReason: string | null; canPrepareSamples: boolean; preparationBlockedReason: string | null
}
export type TransportationKitOrderInput = { shipmentVersion: number; deliveryLocationId: string; deliveryLocationVersion: number; containers: ContainerQuantity[] }
function read<T>(value: Envelope<T>): T { if (!value.success) throw new Error(value.error?.message ?? 'The transportation kit request could not be completed.'); return value.data }
export async function getShipmentKitSupply(shipmentId: string, deliveryLocationId?: string) {
  return read((await api.get<Envelope<ShipmentKitSupply>>(`/sample-shipping/${shipmentId}/kit-supply`, { params: { deliveryLocationId } })).data)
}
export async function orderTransportationKits(shipmentId: string, input: TransportationKitOrderInput, idempotencyKey: string) {
  return read((await api.post<Envelope<TransportationKitRequest>>(`/sample-shipping/${shipmentId}/kit-requests`, input, { headers: { 'Idempotency-Key': idempotencyKey } })).data)
}
export async function confirmTransportationKitsReceived(id: string, input: { version: number; stockKitIds: string[] }, idempotencyKey: string) {
  return read((await api.post<Envelope<TransportationKitRequest>>(`/transportation-kit-requests/${id}/received`, input, { headers: { 'Idempotency-Key': idempotencyKey } })).data)
}
export async function cancelTransportationKitRequest(id: string, input: { version: number; reason?: string }, idempotencyKey: string) {
  return read((await api.post<Envelope<TransportationKitRequest>>(`/transportation-kit-requests/${id}/cancel`, input, { headers: { 'Idempotency-Key': idempotencyKey } })).data)
}

export type AvailableTransportationStockKit = { id: string; kitNumber: string; containerDefinitionId: string; sku: string; commonName: string; tubeCapacity: number; version: number }
export type TransportationKitRequestDetail = { request: TransportationKitRequest; availableStockKits: AvailableTransportationStockKit[]; canDispatch: boolean; dispatchBlockedReason: string | null }
const platformPath = '/platform/sample-shipping/kit-requests'
export async function getPlatformTransportationKitRequests(status?: string) { return read((await api.get<Envelope<TransportationKitRequest[]>>(platformPath, { params: { status } })).data) }
export async function getPlatformTransportationKitRequest(id: string) { return read((await api.get<Envelope<TransportationKitRequestDetail>>(`${platformPath}/${id}`)).data) }
export async function dispatchTransportationKitRequest(id: string, input: { version: number; stockKitIds: string[]; outboundCarrier: string; outboundTrackingNumber: string; fulfilledAt: string }, idempotencyKey: string) { return read((await api.post<Envelope<TransportationKitRequestDetail>>(`${platformPath}/${id}/dispatch`, input, { headers: { 'Idempotency-Key': idempotencyKey } })).data) }
export async function cancelPlatformTransportationKitRequest(id: string, input: { version: number; reason?: string }, idempotencyKey: string) { return read((await api.post<Envelope<TransportationKitRequest>>(`${platformPath}/${id}/cancel`, input, { headers: { 'Idempotency-Key': idempotencyKey } })).data) }
