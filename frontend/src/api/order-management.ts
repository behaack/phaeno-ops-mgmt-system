import axios from 'axios'

import { api } from './client'

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: null | { code: string; message: string; details?: unknown }
}

export type PagedResult<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export type OrderListItem = {
  id: string
  number: string
  status: string
  reference: string | null
  organizationId: string
  createdAt: string
  updatedAt: string
  version: number
  tenantSafeReason: string | null
  assignedToUserId?: string | null
  dueAt?: string | null
  isOverdue?: boolean
}

export type TimelineItem = {
  id: string
  fromStatus: string
  toStatus: string
  reason: string | null
  internalNote: string | null
  actorUserId: string
  occurredAt: string
}

export type CommercialDocument = {
  id: string
  kind: string
  syncStatus: string
  documentNumber: string | null
  documentUrl: string | null
  total: number
  balance: number
  currency: string
  synchronizedAt: string | null
  lastError: string | null
  version: number
}

export type OperationalFile = {
  id: string
  parentRecordId: string | null
  purpose: string
  fileName: string
  fileKind: string
  contentType: string
  sizeBytes: number
  scanStatus: string
  releaseStatus: string
  releasedAt: string | null
  createdAt: string
  version: number
}

export type Quote = {
  id: string
  revision: number
  purpose: string
  status: string
  linesJson: string
  subtotal: number
  tax: number
  total: number
  currency: string
  issuedAt: string
  expiresAt: string
  acceptedAt: string | null
  version: number
}

export type CancellationRequest = {
  id: string
  reason: string
  scopeJson: string
  status: string
  decisionReason: string | null
  createdAt: string
  decidedAt: string | null
  version: number
}

export type LabSample = {
  id: string
  customerSampleId: string
  materialType: string
  biologicalSource: string
  quantity: number
  quantityUnit: string
  storageRequirements: string
  safetyDeclaration: string
  collectionDate: string | null
  concentration: number | null
  notes: string | null
  analysisDefinitionIdsJson: string
  accessionId: string | null
  status: string
  replacementForSampleId: string | null
  receivedAt: string | null
  receiptCondition: string | null
  carrier: string | null
  trackingNumber: string | null
  customerShippedAt: string | null
  tenantSafeReason: string | null
  internalNote: string | null
  version: number
}

export type LabResultRelease = {
  id: string
  labSampleId: string
  releaseVersion: number
  analysisProfile: string
  pipelineVersion: string
  provenance: string
  qcStatus: string
  manifestJson: string
  releaseStatus: string
  generatedAt: string
  releasedAt: string | null
  version: number
}

export type LabRequestRevision = {
  id: string
  revision: number
  previousRevisionId: string | null
  snapshotJson: string
  correctionReason: string | null
  submittedByUserId: string
  submittedAt: string
}

export type LabServiceOrder = {
  id: string
  organizationId: string
  orderNumber: string
  customerReference: string | null
  submissionInstructions: string
  status: string
  requestRevision: number
  submittedAt: string | null
  placedAt: string | null
  completedAt: string | null
  tenantSafeReason: string | null
  internalNote: string | null
  createdAt: string
  updatedAt: string
  version: number
  canEdit: boolean
  canSubmit: boolean
  canAcceptQuote: boolean
  canWithdraw: boolean
  canRequestCancellation: boolean
  samples: LabSample[]
  quotes: Quote[]
  resultReleases: LabResultRelease[]
  resultFiles: OperationalFile[]
  documents: CommercialDocument[]
  cancellationRequests: CancellationRequest[]
  timeline: TimelineItem[]
  assignedToUserId?: string | null
  dueAt?: string | null
  requestRevisions?: LabRequestRevision[] | null
  labMilestone?: string | null
  labScheduleHealth?: string | null
  labExpectedCompletionAtUtc?: string | null
  labCustomerActionCount?: number
  labCustomerActionSummary?: string | null
  labPermittedQcProjectionJson?: string | null
  labReadyForRelease?: boolean
}

export type ReagentOrderLine = {
  id: string
  offeringId: string
  qboCatalogItemId: string
  externalItemId: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  currency: string
  lineTotal: number
  note: string | null
  shippedQuantity: number
  cancelledQuantity: number
  remainingQuantity: number
  estimatedShipDate: string | null
  version: number
}

export type ReagentShipment = {
  id: string
  shipmentNumber: string
  packingSlipNumber: string
  carrier: string
  service: string | null
  trackingNumber: string
  shippedAt: string
  lines: Array<{ id: string; orderLineId: string; quantity: number; lotBatchNumber: string; expiresAt: string | null }>
  version: number
}

export type ReagentAdjustment = {
  id: string
  originalLineId: string
  proposedOfferingId: string
  beforeJson: string
  afterJson: string
  reason: string
  totalDifference: number
  status: string
  decidedAt: string | null
  version: number
}

export type ReagentOrder = {
  id: string
  organizationId: string
  orderNumber: string
  status: string
  purchaseOrderNumber: string | null
  shippingAddressId: string | null
  shippingAddressSnapshotJson: string | null
  requestedDeliveryDate: string | null
  shippingInstructions: string | null
  placedAt: string | null
  acceptedAt: string | null
  fulfilledAt: string | null
  tenantSafeReason: string | null
  internalNote: string | null
  createdAt: string
  updatedAt: string
  version: number
  canEdit: boolean
  canPlace: boolean
  canCancel: boolean
  canRequestCancellation: boolean
  lines: ReagentOrderLine[]
  shipments: ReagentShipment[]
  adjustments: ReagentAdjustment[]
  documents: CommercialDocument[]
  cancellationRequests: CancellationRequest[]
  timeline: TimelineItem[]
  assignedToUserId?: string | null
  dueAt?: string | null
  placementSnapshotJson?: string | null
}

export type ShippingAddress = {
  id: string
  label: string
  recipient: string
  line1: string
  line2: string | null
  city: string
  region: string
  postalCode: string
  countryCode: string
  phone: string | null
  isActive: boolean
  version: number
}

export type AssemblyProfile = {
  id: string
  qboCatalogItemId: string
  name: string
  profileVersion: number
  description: string
  instructions: string
  metadataSchemaJson: string
  allowedFileKindsJson: string
  outputContractJson: string
  maximumFileSizeBytes: number
  maximumTotalSizeBytes: number
  isActive: boolean
  isSynthetic: boolean
  version: number
}

export type AnalysisDefinition = {
  id: string
  qboCatalogItemId: string
  name: string
  description: string
  submissionInstructions: string
  requiredIntakeFieldsJson: string
  resultContractJson: string
  isActive: boolean
  isSynthetic: boolean
  version: number
}

export type ReagentOffering = {
  id: string
  partnerOrganizationId: string
  qboCatalogItemId: string
  itemName: string
  negotiatedUnitPrice: number
  currency: string
  sellingUnit: string
  orderIncrement: number
  minimumQuantity: number
  maximumQuantity: number | null
  shippingRestrictionsJson: string
  effectiveFrom: string
  effectiveUntil: string | null
  isActive: boolean
  version: number
}

export type AssemblyOutputRelease = {
  id: string
  inputRevisionId: string
  processingRunId: string
  releaseVersion: number
  manifestJson: string
  pipelineVersion: string
  provenance: string
  qcStatus: string
  releaseStatus: string
  generatedAt: string
  releasedAt: string | null
  files: OperationalFile[]
  version: number
}

export type DataAssemblyRequest = {
  id: string
  organizationId: string
  requestNumber: string
  projectReference: string
  assemblyProfileId: string
  assemblyProfileVersion: number
  profileName: string
  profileInstructions: string
  metadataJson: string
  requestedOutput: string
  processingNotes: string | null
  prohibitedDataConfirmed: boolean
  status: string
  inputRevision: number
  purchaseOrderNumber: string | null
  submittedAt: string | null
  placedAt: string | null
  completedAt: string | null
  tenantSafeReason: string | null
  internalNote: string | null
  createdAt: string
  updatedAt: string
  version: number
  canEdit: boolean
  canSubmit: boolean
  canAcceptQuote: boolean
  canWithdraw: boolean
  canRequestCancellation: boolean
  inputRevisions: Array<{ id: string; revision: number; previousRevisionId: string | null; manifestJson: string; correctionReason: string | null; validationSummaryJson: string; submittedAt: string }>
  quotes: Quote[]
  processingRuns: Array<{ id: string; inputRevisionId: string; runNumber: number; profileVersion: string; pipelineVersion: string; provenance: string; qcStatus: string | null; startedAt: string; completedAt: string | null; failureReason: string | null; version: number }>
  outputReleases: AssemblyOutputRelease[]
  inputFiles: OperationalFile[]
  documents: CommercialDocument[]
  cancellationRequests: CancellationRequest[]
  timeline: TimelineItem[]
  assignedToUserId?: string | null
  dueAt?: string | null
}

export type IntegrationMessage = {
  id: string
  operation: string
  workflowType: string
  workflowId: string
  status: string
  attemptCount: number
  nextAttemptAt: string
  lastError: string | null
  createdAt: string
  version: number
}

export type NotificationMessage = {
  id: string
  workflowType: string
  workflowId: string
  eventType: string
  subject: string
  status: string
  attemptCount: number
  nextAttemptAt: string
  lastError: string | null
  createdAt: string
  version: number
}

export type OrderConfiguration = {
  system: { id: string; quoteValidityDays: number; sampleSubmissionInstructions: string; shippingConfigurationJson: string; version: number }
  catalogItems: Array<{ id: string; externalItemId: string; name: string; description: string; salesUnit: string; basePrice: number; currency: string; isActive: boolean; lastSyncedAt: string; version: number }>
  analyses: AnalysisDefinition[]
  reagentOfferings: ReagentOffering[]
  assemblyProfiles: AssemblyProfile[]
  commercialProfiles: Array<{ id: string; organizationId: string; organizationName: string; labCreditApproved: boolean; assemblyCreditApproved: boolean; qboCustomerId: string | null; version: number }>
}

export type LabSampleWrite = {
  id?: string
  customerSampleId: string
  materialType: string
  biologicalSource: string
  quantity: number
  quantityUnit: string
  storageRequirements: string
  safetyDeclaration: string
  collectionDate?: string | null
  concentration?: number | null
  notes?: string | null
  analysisDefinitionIds: string[]
  replacementForSampleId?: string | null
}

export async function listLabOrders(params?: Record<string, string | number | undefined>) {
  return get<PagedResult<OrderListItem>>('/lab-service-orders', params)
}
export async function getLabOrder(id: string) { return get<LabServiceOrder>(`/lab-service-orders/${id}`) }
export async function createLabOrder(input: { customerReference?: string; samples: LabSampleWrite[] }) {
  return post<LabServiceOrder>('/lab-service-orders', input, true)
}
export async function updateLabOrder(id: string, input: { customerReference?: string; samples: LabSampleWrite[]; version: number }) {
  return patch<LabServiceOrder>(`/lab-service-orders/${id}`, input)
}
export async function submitLabOrder(id: string, version: number) { return post<LabServiceOrder>(`/lab-service-orders/${id}/submit-for-quote`, { version }, true) }
export async function withdrawLabOrder(id: string, version: number, reason: string) { return post<LabServiceOrder>(`/lab-service-orders/${id}/withdraw`, { version, reason }) }
export async function acceptLabQuote(orderId: string, quoteId: string, version: number) {
  return post<LabServiceOrder>(`/lab-service-orders/${orderId}/quotes/${quoteId}/accept`, { version, quoteId }, true)
}
export async function requestLabCancellation(id: string, version: number, reason: string) {
  return post<LabServiceOrder>(`/lab-service-orders/${id}/cancellation-requests`, { version, reason, scopeJson: '{}' }, true)
}
export async function recordLabSampleShipment(orderId: string, sampleId: string, input: { version: number; carrier?: string | null; trackingNumber?: string | null; shippedAt?: string | null }) {
  return api.put<ApiEnvelope<LabServiceOrder>>(`/lab-service-orders/${orderId}/samples/${sampleId}/shipment`, input).then((response) => unwrap(response.data))
}
export async function downloadLabResult(orderId: string, file: OperationalFile) {
  const response = await api.get<Blob>(`/lab-service-orders/${orderId}/results/${file.id}/download`, { responseType: 'blob' })
  saveBlob(response.data, file.fileName)
}

export async function listReagentOrders(params?: Record<string, string | number | undefined>) { return get<PagedResult<OrderListItem>>('/reagent-orders', params) }
export async function getReagentOrder(id: string) { return get<ReagentOrder>(`/reagent-orders/${id}`) }
export async function listReagentOfferings() { return get<ReagentOffering[]>('/order-catalog/reagent-offerings') }
export async function listShippingAddresses() { return get<ShippingAddress[]>('/partner-shipping-addresses') }
export async function createShippingAddress(input: Omit<ShippingAddress, 'id' | 'isActive' | 'version'>) { return post<ShippingAddress>('/partner-shipping-addresses', input) }
export async function createReagentOrder(lines: Array<{ offeringId: string; quantity: number; note?: string }>) {
  return post<ReagentOrder>('/reagent-orders', { lines }, true)
}
export async function createReagentDraftFromPrior(id: string) { return post<ReagentOrder>(`/reagent-orders/${id}/create-draft`, {}, true) }
export async function updateReagentOrder(id: string, lines: Array<{ offeringId: string; quantity: number; note?: string }>, version: number) {
  return patch<ReagentOrder>(`/reagent-orders/${id}`, { lines, version })
}
export async function placeReagentOrder(id: string, input: { version: number; purchaseOrderNumber: string; shippingAddressId: string; requestedDeliveryDate?: string | null; shippingInstructions?: string | null }) {
  return post<ReagentOrder>(`/reagent-orders/${id}/place`, input, true)
}
export async function decideReagentAdjustment(orderId: string, adjustmentId: string, version: number, approved: boolean) {
  return post<ReagentOrder>(`/reagent-orders/${orderId}/adjustments/${adjustmentId}/decision`, { version, approved })
}
export async function requestReagentCancellation(id: string, version: number, reason: string) {
  return post<ReagentOrder>(`/reagent-orders/${id}/cancellation-requests`, { version, reason, scopeJson: '{}' }, true)
}
export async function cancelReagentOrder(id: string, version: number, reason: string) { return post<ReagentOrder>(`/reagent-orders/${id}/cancel`, { version, reason }) }

export async function listAssemblyRequests(params?: Record<string, string | number | undefined>) { return get<PagedResult<OrderListItem>>('/data-assembly-requests', params) }
export async function getAssemblyRequest(id: string) { return get<DataAssemblyRequest>(`/data-assembly-requests/${id}`) }
export async function listAssemblyProfiles() { return get<AssemblyProfile[]>('/order-catalog/assembly-profiles') }
export async function createAssemblyRequest(input: { assemblyProfileId: string; projectReference: string; metadataJson: string; requestedOutput: string; processingNotes?: string; prohibitedDataConfirmed: boolean }) {
  return post<DataAssemblyRequest>('/data-assembly-requests', input, true)
}
export async function updateAssemblyRequest(id: string, input: { assemblyProfileId: string; projectReference: string; metadataJson: string; requestedOutput: string; processingNotes?: string; prohibitedDataConfirmed: boolean; version: number }) {
  return patch<DataAssemblyRequest>(`/data-assembly-requests/${id}`, input)
}
export async function uploadAssemblyInput(id: string, file: File) {
  const form = new FormData(); form.append('file', file)
  const response = await api.post<ApiEnvelope<OperationalFile>>(`/data-assembly-requests/${id}/inputs`, form, { headers: { 'Content-Type': undefined } })
  return unwrap(response.data)
}
export async function submitAssemblyRequest(id: string, version: number, files: OperationalFile[]) {
  return post<DataAssemblyRequest>(`/data-assembly-requests/${id}/submit`, { version, manifestJson: JSON.stringify({ files: files.map((file) => ({ id: file.id, name: file.fileName })) }), validationSummaryJson: '{}' }, true)
}
export async function acceptAssemblyQuote(id: string, quoteId: string, version: number, purchaseOrderNumber: string) {
  return post<DataAssemblyRequest>(`/data-assembly-requests/${id}/quotes/${quoteId}/accept`, { version, quoteId, purchaseOrderNumber }, true)
}
export async function requestAssemblyCancellation(id: string, version: number, reason: string) {
  return post<DataAssemblyRequest>(`/data-assembly-requests/${id}/cancellation-requests`, { version, reason, scopeJson: '{}' }, true)
}
export async function withdrawAssemblyRequest(id: string, version: number, reason: string) { return post<DataAssemblyRequest>(`/data-assembly-requests/${id}/withdraw`, { version, reason }) }
export async function downloadAssemblyOutput(requestId: string, releaseId: string, file: OperationalFile) {
  const response = await api.get<Blob>(`/data-assembly-requests/${requestId}/outputs/${releaseId}/files/${file.id}/download`, { responseType: 'blob' })
  saveBlob(response.data, file.fileName)
}

export async function exportOrderList(workflow: 'lab' | 'reagent' | 'assembly', params?: Record<string, string | undefined>) {
  const path = workflow === 'lab' ? 'lab-service-orders' : workflow === 'reagent' ? 'reagent-orders' : 'data-assembly-requests'
  const response = await api.get<Blob>(`/${path}/export`, { params, responseType: 'blob' })
  saveBlob(response.data, `${path}-${new Date().toISOString().slice(0, 10)}.csv`)
}

export async function listPlatformOrders(workflow: 'lab' | 'reagent' | 'assembly', params?: Record<string, string | number | boolean | undefined>) {
  const path = workflow === 'lab' ? 'lab-service-orders' : workflow === 'reagent' ? 'reagent-orders' : 'data-assembly-requests'
  return get<PagedResult<OrderListItem>>(`/platform/${path}`, params)
}
export async function updateOperationalAssignment(workflow: 'lab' | 'reagent' | 'assembly', id: string, input: { version: number; assignToMe: boolean; dueAt?: string | null }) {
  return api.put<ApiEnvelope<{ workflow: string; recordId: string; assignedToUserId: string | null; dueAt: string | null; version: number }>>(`/platform/order-assignments/${workflow}/${id}`, input).then((response) => unwrap(response.data))
}
export async function getPlatformOrder(workflow: 'lab' | 'reagent' | 'assembly', id: string) {
  const path = workflow === 'lab' ? 'lab-service-orders' : workflow === 'reagent' ? 'reagent-orders' : 'data-assembly-requests'
  if (workflow === 'lab') return get<LabServiceOrder>(`/platform/${path}/${id}`)
  if (workflow === 'reagent') return get<ReagentOrder>(`/platform/${path}/${id}`)
  return get<DataAssemblyRequest>(`/platform/${path}/${id}`)
}
export type LabIntake = { orderId: string; orderNumber: string; workOrderId: string }
export async function getPlatformLabIntake(orderId: string) {
  return get<LabIntake>(`/platform/lab-service-orders/${orderId}/lab-intake`)
}
export async function runPlatformAction<T>(path: string, body: unknown, idempotent = false) { return post<T>(`/platform/${path}`, body, idempotent) }
export type QuoteLineInput = { catalogItemId: string; description: string; quantity: number; unitPrice: number }
export async function issuePlatformQuote(workflow: 'lab' | 'assembly', id: string, input: { version: number; lines: QuoteLineInput[]; tax: number; currency: string; expiresAt?: string | null; purpose: 'Initial' | 'Change' }) {
  const path = workflow === 'lab' ? 'lab-service-orders' : 'data-assembly-requests'
  return runPlatformAction<LabServiceOrder | DataAssemblyRequest>(`${path}/${id}/quotes`, input, true)
}
export async function receivePlatformLabSample(orderId: string, sampleId: string, input: { version: number; receivedAt: string; receiptCondition: string }) {
  return runPlatformAction<LabServiceOrder>(`lab-service-orders/${orderId}/samples/${sampleId}/receive`, input)
}
export async function accessionPlatformLabSample(orderId: string, sampleId: string, input: { version: number; accessionId: string }) {
  return runPlatformAction<LabServiceOrder>(`lab-service-orders/${orderId}/samples/${sampleId}/accession`, input)
}
export async function transitionPlatformLabSample(orderId: string, sampleId: string, input: { version: number; status: string; reason?: string | null; internalNote?: string | null }) {
  return runPlatformAction<LabServiceOrder>(`lab-service-orders/${orderId}/samples/${sampleId}/transition`, input)
}
export async function uploadPlatformLabResult(orderId: string, sampleId: string, input: { file: File; analysisProfile: string; pipelineVersion: string; provenance: string; qcStatus: string }) {
  const form = new FormData()
  form.append('file', input.file)
  form.append('analysisProfile', input.analysisProfile)
  form.append('pipelineVersion', input.pipelineVersion)
  form.append('provenance', input.provenance)
  form.append('qcStatus', input.qcStatus)
  const response = await api.post<ApiEnvelope<OperationalFile>>(`/platform/lab-service-orders/${orderId}/samples/${sampleId}/results`, form, { headers: { 'Content-Type': undefined } })
  return unwrap(response.data)
}
export async function releasePlatformLabResult(orderId: string, sampleId: string, releaseId: string, version: number) {
  return runPlatformAction<LabServiceOrder>(`lab-service-orders/${orderId}/samples/${sampleId}/results/${releaseId}/release`, { version }, true)
}
export async function uploadPlatformAssemblyOutput(requestId: string, runId: string, file: File) {
  const form = new FormData(); form.append('file', file)
  const response = await api.post<ApiEnvelope<OperationalFile>>(`/platform/data-assembly-requests/${requestId}/processing-runs/${runId}/outputs`, form, { headers: { 'Content-Type': undefined } })
  return unwrap(response.data)
}
export async function getOrderConfiguration() { return get<OrderConfiguration>('/platform/order-configuration') }
export async function updateOrderSystemConfiguration(input: OrderConfiguration['system']) { return patch<OrderConfiguration>('/platform/order-configuration/system', input) }
export async function syncQuickBooksCatalog() { return post<IntegrationMessage>('/platform/order-configuration/catalog/sync', {}, true) }
export async function saveAnalysisDefinition(id: string | null, input: Omit<AnalysisDefinition, 'id'>) {
  return id ? patch<AnalysisDefinition>(`/platform/order-configuration/analyses/${id}`, input) : post<AnalysisDefinition>('/platform/order-configuration/analyses', input)
}
export async function saveReagentOffering(id: string | null, input: {
  partnerOrganizationId: string; qboCatalogItemId: string; negotiatedUnitPrice: number; currency: string; sellingUnit: string;
  orderIncrement: number; minimumQuantity: number | null; maximumQuantity: number | null; shippingRestrictionsJson: string;
  effectiveFrom: string; effectiveUntil: string | null; isActive: boolean; version?: number
}) {
  return id ? patch<ReagentOffering>(`/platform/order-configuration/reagent-offerings/${id}`, input) : post<ReagentOffering>('/platform/order-configuration/reagent-offerings', input)
}
export async function saveAssemblyProfile(id: string | null, input: Omit<AssemblyProfile, 'id'>) {
  return id ? patch<AssemblyProfile>(`/platform/order-configuration/assembly-profiles/${id}`, input) : post<AssemblyProfile>('/platform/order-configuration/assembly-profiles', input)
}
export async function saveCommercialProfile(input: { organizationId: string; labCreditApproved: boolean; assemblyCreditApproved: boolean; qboCustomerId: string | null; version?: number }) {
  return api.put<ApiEnvelope<OrderConfiguration['commercialProfiles'][number]>>(`/platform/order-configuration/commercial-profiles/${input.organizationId}`, input).then((response) => unwrap(response.data))
}
export async function listIntegrationMessages(status?: string) { return get<PagedResult<IntegrationMessage>>('/platform/order-integrations', { status }) }
export async function retryIntegrationMessage(id: string, version: number) { return post<IntegrationMessage>(`/platform/order-integrations/${id}/retry`, { version }, true) }
export async function listNotificationMessages(status?: string) { return get<PagedResult<NotificationMessage>>('/platform/order-notifications', { status }) }
export async function retryNotificationMessage(id: string, version: number) { return post<NotificationMessage>(`/platform/order-notifications/${id}/retry`, { version }, true) }

async function get<T>(url: string, params?: Record<string, string | number | boolean | undefined>) {
  const response = await api.get<ApiEnvelope<T>>(url, { params })
  return unwrap(response.data)
}

async function post<T>(url: string, data: unknown, idempotent = false) {
  const response = await api.post<ApiEnvelope<T>>(url, data, idempotent ? { headers: { 'Idempotency-Key': crypto.randomUUID() } } : undefined)
  return unwrap(response.data)
}

async function patch<T>(url: string, data: unknown) {
  const response = await api.patch<ApiEnvelope<T>>(url, data)
  return unwrap(response.data)
}

function unwrap<T>(envelope: ApiEnvelope<T>) {
  if (!envelope.success) throw new Error(envelope.error?.message ?? 'The request failed.')
  return envelope.data
}

export function getOrderErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ApiEnvelope<unknown>>(error)) return error.response?.data.error?.message ?? fallback
  return error instanceof Error ? error.message : fallback
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
