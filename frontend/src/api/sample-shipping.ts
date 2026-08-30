import { api } from './client'

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: null | { code: string; message: string; details?: unknown }
}

export type SampleShippingDestination = {
  id: string
  definitionKey: string
  revision: number
  supersedesDestinationId: string | null
  code: string
  name: string
  recipientName: string
  organizationName: string
  addressLine1: string
  addressLine2: string | null
  city: string
  stateOrProvince: string
  postalCode: string
  countryCode: string
  receivingPhone: string | null
  receivingEmail: string | null
  receivingHours: string
  timeZoneId: string
  closureInstructions: string | null
  deliveryInstructions: string
  carrierRestrictions: string | null
  internationalShippingAllowed: boolean
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  version: number
}

export type SampleTypeDefinition = {
  id: string
  definitionKey: string
  revision: number
  supersedesSampleTypeId: string | null
  code: string
  name: string
  description: string
  materialClass: string
  minimumQuantity: number | null
  maximumQuantity: number | null
  quantityUnit: string
  primaryContainerRequirements: string
  temperatureRequirements: string
  stabilizerRequirements: string | null
  packagingInstructions: string
  labelingInstructions: string
  prohibitedIdentifiers: string
  safetyRequirements: string
  carrierRestrictions: string | null
  maximumTransitHours: number | null
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  version: number
}

export type SampleShippingInstructionRule = {
  id: string
  definitionKey: string
  revision: number
  supersedesInstructionRuleId: string | null
  destinationId: string
  destinationName: string
  sampleTypeDefinitionId: string
  sampleTypeName: string
  compatibilityGroup: string
  packingInstructions: string
  temperatureInstructions: string
  carrierInstructions: string
  dispatchInstructions: string
  deliveryInstructions: string
  requiredDocuments: string
  exceptionInstructions: string
  internationalCustomsInstructions: string | null
  requiresSeparateShipment: boolean
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  version: number
}

export type SampleShippingConfiguration = {
  destinations: SampleShippingDestination[]
  sampleTypes: SampleTypeDefinition[]
  instructionRules: SampleShippingInstructionRule[]
}

export type SampleShippingDestinationWrite = Omit<
  SampleShippingDestination,
  'id' | 'definitionKey' | 'revision' | 'supersedesDestinationId' | 'effectiveTo' | 'version'
> & {
  supersedesDestinationId: string | null
  supersededVersion: number | null
}

export type SampleTypeDefinitionWrite = Omit<
  SampleTypeDefinition,
  'id' | 'definitionKey' | 'revision' | 'supersedesSampleTypeId' | 'effectiveTo' | 'version'
> & {
  supersedesSampleTypeId: string | null
  supersededVersion: number | null
}

export type SampleShippingInstructionRuleWrite = Omit<
  SampleShippingInstructionRule,
  'id' | 'definitionKey' | 'revision' | 'supersedesInstructionRuleId' | 'destinationName' | 'sampleTypeName' | 'effectiveTo' | 'version'
> & {
  supersedesInstructionRuleId: string | null
  supersededVersion: number | null
}

export type SampleShippingPreview = {
  effectiveAt: string
  destination: SampleShippingDestination
  compatibilityGroup: string
  requiresSeparateShipment: boolean
  sampleRules: Array<{
    sampleType: SampleTypeDefinition
    packingInstructions: string
    temperatureInstructions: string
    carrierInstructions: string
    dispatchInstructions: string
    deliveryInstructions: string
    requiredDocuments: string
    exceptionInstructions: string
    internationalCustomsInstructions: string | null
    requiresSeparateShipment: boolean
  }>
}

export type SampleShippingPacketScan = {
  packetRevisionId: string
  packetNumber: string
  barcode: string
  packetRevision: number
  isVoided: boolean
  voidedAt: string | null
  voidReason: string | null
  replacementBarcode: string | null
  shipmentId: string
  shipmentNumber: string
  shipmentStatus: string
  organizationId: string
  organizationName: string
  authorizationSource: 'ProspectTrialProject' | 'CustomerPromotionalOrder' | 'CustomerLabServiceOrder'
  authorizationSourceId: string
  authorizationReference: string
  authorizationName: string
  labWorkOrderId: string
  labWorkStatus: string
  destinationId: string
  destinationName: string
  carrier: string | null
  trackingNumber: string | null
  shippedAt: string | null
  expectedSampleCount: number
  receivedSampleCount: number
  awaitingReceiptSampleCount: number
  receiptState: 'AwaitingReceipt' | 'PartiallyReceived' | 'ReceiptRecorded' | 'Cancelled' | 'SubmissionMismatch'
  issuedAt: string
  crosswalk: SampleShippingCrosswalkItem[]
}

export type SampleShippingCrosswalkItem = {
  shipmentItemId: string
  submittedSpecimenId: string
  customerSampleId: string
  sampleName: string
  sampleTypeName: string
  quantity: number
  quantityUnit: string
  registeredSampleTubeId: string | null
  supplierTubeBarcode: string | null
  tubeStatus: string
  version: number
  tubeSlotId?: string | null
  tubeOrdinal?: number
  tubeCount?: number
}

export type RegisteredSampleTube = {
  id: string
  supplierBarcode: string
  status: string
  assignedAt: string | null
  accessionedAt: string | null
  version: number
}

export type SampleReturnKit = {
  id: string
  kitNumber: string
  sampleShipmentId: string
  organizationId: string
  authorizationSource: 'ProspectTrialProject' | 'CustomerPromotionalOrder' | 'CustomerLabServiceOrder'
  authorizationSourceId: string
  tubeSupplierName: string
  tubeProductNumber: string
  tubeLotNumber: string | null
  shipperSupplierName: string
  shipperProductNumber: string
  requiredTubeCount: number
  status: string
  outboundCarrier: string | null
  outboundTrackingNumber: string | null
  fulfilledAt: string | null
  version: number
  tubes: RegisteredSampleTube[]
}

export type SampleShipmentWorkflow = {
  id: string
  shipmentNumber: string
  organizationId: string
  organizationName: string
  authorizationSource: 'ProspectTrialProject' | 'CustomerPromotionalOrder' | 'CustomerLabServiceOrder'
  authorizationSourceId: string
  authorizationReference: string
  authorizationName: string
  labWorkOrderId: string
  destinationId: string
  destinationName: string
  status: string
  carrier: string | null
  trackingNumber: string | null
  shippedAt: string | null
  version: number
  returnKit: SampleReturnKit | null
  crosswalk: SampleShippingCrosswalkItem[]
  currentPacket: {
    id: string
    revision: number
    packetNumber: string
    barcode: string
    issuedAt: string
    isVoided: boolean
  } | null
}

export type SampleShippingPacketDocument = {
  shipment: SampleShipmentWorkflow
  destinationSnapshotJson: string
  instructionSnapshotJson: string
  manifestSnapshotJson: string
}

export type RegisteredSampleTubeScan = {
  packetBarcode: string
  supplierTubeBarcode: string
  isExpected: boolean
  shipmentItemId: string | null
  submittedSpecimenId: string | null
  customerSampleId: string | null
  sampleName: string | null
  tubeStatus: string | null
  isAccessioned: boolean
  outcome: 'Expected' | 'AlreadyAccessioned' | 'PacketVoided' | 'TubeNotRegistered' | 'TubeNotExpectedForPacket'
}

export async function getSampleShippingConfiguration() {
  const response = await api.get<ApiEnvelope<SampleShippingConfiguration>>('/platform/sample-shipping/configuration')
  return unwrap(response.data)
}

export async function createSampleShippingDestination(input: SampleShippingDestinationWrite) {
  const response = await api.post<ApiEnvelope<SampleShippingDestination>>('/platform/sample-shipping/destinations', input)
  return unwrap(response.data)
}

export async function createSampleTypeDefinition(input: SampleTypeDefinitionWrite) {
  const response = await api.post<ApiEnvelope<SampleTypeDefinition>>('/platform/sample-shipping/sample-types', input)
  return unwrap(response.data)
}

export async function createSampleShippingInstructionRule(input: SampleShippingInstructionRuleWrite) {
  const response = await api.post<ApiEnvelope<SampleShippingInstructionRule>>('/platform/sample-shipping/instruction-rules', input)
  return unwrap(response.data)
}

export async function previewSampleShipping(input: {
  destinationId: string
  sampleTypeDefinitionIds: string[]
  effectiveAt?: string | null
}) {
  const response = await api.post<ApiEnvelope<SampleShippingPreview>>('/platform/sample-shipping/preview', input)
  return unwrap(response.data)
}

export async function scanSampleShippingPacket(barcode: string) {
  const response = await api.get<ApiEnvelope<SampleShippingPacketScan>>('/platform/lab-operations/sample-shipping/packets/scan', {
    params: { barcode },
  })
  return unwrap(response.data)
}

export async function getSampleShipments() {
  const response = await api.get<ApiEnvelope<SampleShipmentWorkflow[]>>('/sample-shipping')
  return unwrap(response.data)
}

export async function getSampleShipment(id: string) {
  const response = await api.get<ApiEnvelope<SampleShipmentWorkflow>>(`/sample-shipping/${id}`)
  return unwrap(response.data)
}

export async function assignSampleTube(shipmentId: string, shipmentItemId: string, input: {
  supplierBarcode: string
  reason?: string | null
  version: number
  tubeSlotId?: string | null
}) {
  const response = await api.put<ApiEnvelope<SampleShipmentWorkflow>>(
    `/sample-shipping/${shipmentId}/items/${shipmentItemId}/tube`, input,
  )
  return unwrap(response.data)
}

export async function issueSampleShippingPacket(shipmentId: string, input: {
  version: number
  replacementReason?: string | null
}) {
  const response = await api.post<ApiEnvelope<SampleShipmentWorkflow>>(
    `/sample-shipping/${shipmentId}/packet`, input,
  )
  return unwrap(response.data)
}

export async function recordSampleShipment(shipmentId: string, input: {
  carrier: string
  trackingNumber: string
  shippedAt: string
  version: number
}) {
  const response = await api.post<ApiEnvelope<SampleShipmentWorkflow>>(
    `/sample-shipping/${shipmentId}/shipped`, input,
  )
  return unwrap(response.data)
}

export async function getSampleShippingPacket(id: string) {
  const response = await api.get<ApiEnvelope<SampleShippingPacketDocument>>(`/sample-shipping/${id}/packet`)
  return unwrap(response.data)
}

export async function downloadSampleShippingCrosswalk(id: string) {
  const response = await api.get<Blob>(`/sample-shipping/${id}/crosswalk.csv`, { responseType: 'blob' })
  return response.data
}

export async function getPlatformSampleShipments() {
  const response = await api.get<ApiEnvelope<SampleShipmentWorkflow[]>>('/platform/lab-operations/sample-shipping/workflow/shipments')
  return unwrap(response.data)
}

export async function createSampleReturnKit(shipmentId: string, input: {
  requiredTubeCount: number
  tubeSupplierName: string
  tubeProductNumber: string
  tubeLotNumber?: string | null
  shipperSupplierName: string
  shipperProductNumber: string
}) {
  const response = await api.post<ApiEnvelope<SampleShipmentWorkflow>>(
    `/platform/lab-operations/sample-shipping/workflow/shipments/${shipmentId}/return-kit`, input,
  )
  return unwrap(response.data)
}

export async function registerSampleTubes(kitId: string, input: {
  supplierBarcodes: string[]
  version: number
}) {
  const response = await api.post<ApiEnvelope<SampleShipmentWorkflow>>(
    `/platform/lab-operations/sample-shipping/workflow/return-kits/${kitId}/tubes`, input,
  )
  return unwrap(response.data)
}

export async function fulfillSampleReturnKit(kitId: string, input: {
  outboundCarrier: string
  outboundTrackingNumber: string
  fulfilledAt: string
  version: number
}) {
  const response = await api.post<ApiEnvelope<SampleShipmentWorkflow>>(
    `/platform/lab-operations/sample-shipping/workflow/return-kits/${kitId}/fulfill`, input,
  )
  return unwrap(response.data)
}

export async function scanRegisteredSampleTube(packetBarcode: string, supplierTubeBarcode: string) {
  const response = await api.get<ApiEnvelope<RegisteredSampleTubeScan>>(
    '/platform/lab-operations/sample-shipping/workflow/tubes/scan',
    { params: { packetBarcode, supplierTubeBarcode } },
  )
  return unwrap(response.data)
}

function unwrap<T>(envelope: ApiEnvelope<T>) {
  if (!envelope.success) throw new Error(envelope.error?.message ?? 'The sample-shipping request failed.')
  return envelope.data
}
