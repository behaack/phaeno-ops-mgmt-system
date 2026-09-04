import axios from 'axios'

import { api } from './client'
import type { DataAssemblyRequest, OrderListItem, PagedResult, ReagentOrder } from './order-management'

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: null | { code: string; message: string; details?: unknown }
}

export type LabRoleAssignment = { id: string; userId: string; userName: string; email: string; role: string; isActive: boolean; version: number }
export type LabWorkOrderSummary = { id: string; authorizationId: string; commercialOrderId: string | null; commercialOrderNumber: string | null; submittingOrganizationId: string; serviceKey: string; status: string; specimenCount: number; openExceptionCount: number; updatedAt: string; version: number; labServiceWorkflowVersionId: string | null }
export type LabProtocolVersion = { id: string; protocolVersion: number; status: string; definitionJson: string; authoredByUserId: string; authoredAtUtc: string; approvedByUserId: string | null; approvedAtUtc: string | null }
export type LabProtocol = { id: string; key: string; name: string; description: string | null; latestVersion: number; versions: LabProtocolVersion[]; version: number }
export type LabMarketedService = { serviceKey: string; name: string }
export type LabServiceWorkflowStage = { id: string; sequence: number; name: string; labProtocolVersionId: string; labProtocolId: string; protocolKey: string; protocolName: string; protocolVersion: number; requirement: 'Required' | 'Optional' | 'Conditional'; condition: string | null; handoffCriteria: string | null }
export type LabServiceWorkflowVersion = { id: string; workflowVersion: number; status: 'Draft' | 'Approved' | 'Production' | 'Retired' | 'Discarded'; authoredByUserId: string; authoredAtUtc: string; approvedByUserId: string | null; approvedAtUtc: string | null; productionByUserId: string | null; productionAtUtc: string | null; stages: LabServiceWorkflowStage[]; version: number }
export type LabServiceWorkflow = { id: string; serviceKey: string; name: string; description: string | null; latestVersion: number; versions: LabServiceWorkflowVersion[]; version: number }
export type LabMaterialDefinition = { id: string; key: string; name: string; kind: string; isActive: boolean }
export type LabSupplier = { id: string; name: string; isActive: boolean }
export type LabStorageLocation = { id: string; name: string; isActive: boolean }
export type LabPreparedReagentComponent = { id: string; componentMaterialLotId: string; materialKey: string; materialName: string; lotNumber: string; quantity: number; quantityUnit: string }
export type LabMaterialLot = { id: string; kind: string; materialDefinitionId: string; materialKey: string; name: string; lotNumber: string; supplierId: string | null; supplier: string | null; expirationOrRetestDate: string | null; storageLocationId: string; storageLocation: string; availableQuantity: number; quantityUnit: string; qcDisposition: string; qcPerformedOn: string | null; qcFailureReason: string | null; components: LabPreparedReagentComponent[]; version: number }
export type LabEquipment = { id: string; assetCode: string; name: string; equipmentType: string; location: string; status: string; lastCalibrationOn: string | null; calibrationDueOn: string | null; version: number }
export type LabBatch = { id: string; batchNumber: string; name: string; batchType: string; status: string; startedAtUtc: string | null; completedAtUtc: string | null; notes: string | null; memberCount: number; sendoutId: string | null; sendoutStatus: string | null; sendoutVersion: number | null; version: number }
export type LabOperationsDashboard = { workOrders: LabWorkOrderSummary[]; protocols: LabProtocol[]; serviceWorkflows: LabServiceWorkflow[]; marketedServices: LabMarketedService[]; materialLots: LabMaterialLot[]; materialDefinitions: LabMaterialDefinition[]; suppliers: LabSupplier[]; storageLocations: LabStorageLocation[]; equipment: LabEquipment[]; batches: LabBatch[]; roleAssignments: LabRoleAssignment[] }
export type CreateLabMaterialLotInput = {
  kind: 'SupplierLot' | 'PreparedReagent'
  materialDefinitionId: string | null
  newMaterialName: string | null
  lotNumber: string
  supplierId: string | null
  newSupplierName: string | null
  storageLocationId: string | null
  newStorageLocationName: string | null
  expirationOrRetestDate: string | null
  availableQuantity: number
  quantityUnit: string
  components: Array<{ componentMaterialLotId: string; quantity: number; quantityUnit: string }>
}

export type LabSpecimen = { id: string; submittedSpecimenId: string; accessionNumber: string | null; receivedAtUtc: string | null; intakeDisposition: string; receiptCondition: string | null; intakeReasonCode: string | null; currentLocation: string | null; version: number }
export type LabContainer = { id: string; labSpecimenId: string | null; parentContainerId: string | null; kind: string; barcode: string; barcodeSource: 'PhaenoGenerated' | 'RegisteredSupplier'; externalBarcodeReferenceId: string | null; label: string; labelPrintCount: number; location: string; quantity: number | null; quantityUnit: string | null; status: string; retainUntilUtc: string | null; version: number }
export type LabContainerScan = { labWorkOrderId: string; commercialOrderNumber: string | null; accessionNumber: string | null; parentBarcode: string | null; labLibraryId: string | null; libraryStatus: string | null; container: LabContainer }
export type LabLabelPrintEvent = { id: string; labContainerId: string; outcome: string; reason: string; failureDetails: string | null; printNumber: number | null; actorUserId: string | null; occurredAtUtc: string }
export type LabContainerLabel = { labWorkOrderId: string; commercialOrderNumber: string | null; accessionNumber: string | null; parentBarcode: string | null; container: LabContainer; printHistory: LabLabelPrintEvent[] }
export type LabExecution = { id: string; labSpecimenId: string | null; labProtocolVersionId: string; assignedToUserId: string | null; status: string; capturedResultsJson: string; deviationNote: string | null; startedAtUtc: string | null; completedAtUtc: string | null; version: number; labServiceWorkflowStageId: string | null }
export type LabLibrary = { id: string; labSpecimenId: string; sourceContainerId: string; libraryContainerId: string; preparationExecutionId: string; libraryKey: string; status: string; qcResultsJson: string | null; version: number }
export type LabException = { id: string; labSpecimenId: string | null; labProtocolExecutionId: string | null; audience: string; categoryCode: string; title: string; internalDescription: string; customerSafeSummary: string | null; isBlocking: boolean; status: string; responseDueAtUtc: string | null; resolvedAtUtc: string | null; version: number }
export type LabScientificApproval = { id: string; approvalVersion: number; releaseDefinitionKey: string; releaseDefinitionVersion: number; approvedByUserId: string; approvedAtUtc: string; projectionVersion: number }
export type LabWorkOrderDetail = { workOrder: LabWorkOrderSummary; specimens: LabSpecimen[]; containers: LabContainer[]; executions: LabExecution[]; libraries: LabLibrary[]; exceptions: LabException[]; scientificApprovals: LabScientificApproval[] }
export type LabPSeqKitOffering = { id: string; partnerOrganizationId: string; itemName: string }

export const getLabOperationsDashboard = () => get<LabOperationsDashboard>('/platform/lab-operations')
export const getLabWorkOrder = (id: string) => get<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${id}`)
export const getLabWorkOrderByCommercialOrder = (commercialOrderId: string) => get<LabWorkOrderSummary>(`/platform/lab-operations/work-orders/by-commercial-order/${commercialOrderId}`)
export const listLabPSeqKitOfferings = (partnerOrganizationId: string) => get<LabPSeqKitOffering[]>('/platform/lab-operations/pseq-kit-offerings', { partnerOrganizationId })
export const listLabManufacturingOrders = (
  workflow: 'reagent' | 'assembly',
  params?: Record<string, string | number | boolean | undefined>,
) => get<PagedResult<OrderListItem>>(
  workflow === 'reagent'
    ? '/platform/lab-operations/pseq-kit-orders'
    : '/platform/lab-operations/data-assembly-requests',
  params,
)
export const getLabManufacturingOrder = (workflow: 'reagent' | 'assembly', id: string) =>
  workflow === 'reagent'
    ? get<ReagentOrder>(`/platform/lab-operations/pseq-kit-orders/${id}`)
    : get<DataAssemblyRequest>(`/platform/lab-operations/data-assembly-requests/${id}`)
export const runLabManufacturingAction = <T>(workflow: 'reagent' | 'assembly', path: string, input: unknown, idempotent = false) =>
  post<T>(`/platform/lab-operations/${workflow === 'reagent' ? 'pseq-kit-orders' : 'data-assembly-requests'}/${path}`, input, idempotent)
export async function uploadLabAssemblyOutput(requestId: string, runId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const response = await api.post<ApiEnvelope<import('./order-management').OperationalFile>>(
    `/platform/lab-operations/data-assembly-requests/${requestId}/processing-runs/${runId}/outputs`,
    form,
    { headers: { 'Content-Type': undefined } },
  )
  return unwrap(response.data)
}
export const setLabRole = (userId: string, role: string, input: { isActive: boolean; version?: number }) => put<LabRoleAssignment>(`/platform/lab-operations/roles/${userId}/${role}`, input)
export const createLabProtocol = (input: { name: string; description?: string }) => post<LabProtocol>('/platform/lab-operations/protocols', input)
export const updateLabProtocol = (id: string, input: { name: string; description: string | null; version: number }) => put<LabProtocol>(`/platform/lab-operations/protocols/${id}`, input)
export const deleteLabProtocol = (id: string, version: number) => api.delete(`/platform/lab-operations/protocols/${id}`, { data: { version } })
export const createLabProtocolVersion = (id: string, input: { definitionJson: string; protocolVersion: number }) => post<LabProtocol>(`/platform/lab-operations/protocols/${id}/versions`, input)
export const updateLabProtocolVersion = (id: string, input: { definitionJson: string; protocolVersion: number }) => put<LabProtocol>(`/platform/lab-operations/protocol-versions/${id}`, input)
export const transitionLabProtocolVersion = (id: string, input: { action: string; protocolVersion: number }) => post<LabProtocol>(`/platform/lab-operations/protocol-versions/${id}/transition`, input)
export const createLabServiceWorkflow = (input: { serviceKey: string; name: string; description?: string | null }) => post<LabServiceWorkflow>('/platform/lab-operations/service-workflows', input)
export const createLabServiceWorkflowVersion = (id: string, input: { stages: Array<{ name: string; labProtocolVersionId: string; requirement: string; condition: string | null; handoffCriteria: string | null }>; workflowVersion: number }) => post<LabServiceWorkflow>(`/platform/lab-operations/service-workflows/${id}/versions`, input)
export const updateLabServiceWorkflowVersion = (id: string, input: { stages: Array<{ name: string; labProtocolVersionId: string; requirement: string; condition: string | null; handoffCriteria: string | null }>; workflowVersion: number }) => put<LabServiceWorkflow>(`/platform/lab-operations/service-workflow-versions/${id}`, input)
export const transitionLabServiceWorkflowVersion = (id: string, input: { action: string; workflowVersion: number }) => post<LabServiceWorkflow>(`/platform/lab-operations/service-workflow-versions/${id}/transition`, input)
export const setLabMilestone = (id: string, status: string, version: number) => post<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${id}/milestone`, { status, version })
export const receiveLabSpecimen = (workId: string, specimenId: string, input: object) => post<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${workId}/specimens/${specimenId}/receipt`, input)
export const accessionLabSpecimen = (workId: string, specimenId: string, input: object) => post<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${workId}/specimens/${specimenId}/accession`, input)
export const setLabSpecimenDisposition = (workId: string, specimenId: string, input: object) => post<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${workId}/specimens/${specimenId}/disposition`, input)
export const createLabContainer = (workId: string, input: object) => post<LabContainer>(`/platform/lab-operations/work-orders/${workId}/containers`, input)
export const scanLabContainer = (barcode: string) => get<LabContainerScan>(`/platform/lab-operations/containers/scan?barcode=${encodeURIComponent(barcode)}`)
export const getLabContainerLabel = (id: string) => get<LabContainerLabel>(`/platform/lab-operations/containers/${id}/label`)
export const recordLabContainerLabelPrint = (id: string, input: { reason: string; outcome: 'Succeeded' | 'Failed'; failureDetails?: string | null }) => post<LabContainerLabel>(`/platform/lab-operations/containers/${id}/label-print`, input)
export const createLabExecution = (workId: string, input: object) => post<LabExecution>(`/platform/lab-operations/work-orders/${workId}/executions`, input)
export const transitionLabExecution = (id: string, input: object) => post<LabExecution>(`/platform/lab-operations/executions/${id}/transition`, input)
export const createLabMaterialLot = (input: CreateLabMaterialLotInput) => post<LabMaterialLot>('/platform/lab-operations/material-lots', input)
export const recordLabMaterialQc = (id: string, input: {
  version: number
  disposition: 'Passed' | 'Failed'
  performedOn: string
  failureReason: string | null
  resultsJson: string
}) => post<LabMaterialLot>(`/platform/lab-operations/material-lots/${id}/qc`, input)
export const consumeLabMaterial = (executionId: string, input: object) => post<LabExecution>(`/platform/lab-operations/executions/${executionId}/material-consumptions`, input)
export const createLabEquipment = (input: {
  name: string
  equipmentType: string
  location: string
  lastCalibrationOn: string | null
  calibrationDueOn: string | null
}) => post<LabEquipment>('/platform/lab-operations/equipment', input)
export const recordLabEquipmentUsage = (executionId: string, input: object) => post<LabExecution>(`/platform/lab-operations/executions/${executionId}/equipment-usages`, input)
export const createLabLibrary = (workId: string, input: object) => post<LabLibrary>(`/platform/lab-operations/work-orders/${workId}/libraries`, input)
export const recordLabLibraryQc = (id: string, input: object) => post<LabLibrary>(`/platform/lab-operations/libraries/${id}/qc`, input)
export const createLabBatch = (input: { name: string; notes?: string | null }) => post<LabBatch>('/platform/lab-operations/batches', input)
export const addLabBatchMember = (id: string, input: object) => post<LabBatch>(`/platform/lab-operations/batches/${id}/members`, input)
export const transitionLabBatch = (id: string, input: { action: 'start' | 'complete'; version: number; occurredAtUtc: string }) => post<LabBatch>(`/platform/lab-operations/batches/${id}/transition`, input)
export const createLabSendout = (id: string, input: object) => post<LabBatch>(`/platform/lab-operations/batches/${id}/sendout`, input)
export const transitionLabSendout = (id: string, input: object) => post<LabBatch>(`/platform/lab-operations/sendouts/${id}/transition`, input)
export const recordLabCustody = (id: string, input: object) => post<LabBatch>(`/platform/lab-operations/sendouts/${id}/custody-events`, input)
export const createLabException = (workId: string, input: object) => post<LabException>(`/platform/lab-operations/work-orders/${workId}/exceptions`, input)
export const resolveLabException = (id: string, input: object) => post<LabException>(`/platform/lab-operations/exceptions/${id}/resolve`, input)
export const approveLabScientificReview = (workId: string, input: object) => post<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${workId}/scientific-approval`, input)

async function get<T>(url: string, params?: Record<string, string | number | boolean | undefined>) { return unwrap((await api.get<ApiEnvelope<T>>(url, { params })).data) }
async function post<T>(url: string, data: unknown, idempotent = false) { return unwrap((await api.post<ApiEnvelope<T>>(url, data, idempotent ? { headers: { 'Idempotency-Key': crypto.randomUUID() } } : undefined)).data) }
async function put<T>(url: string, data: unknown) { return unwrap((await api.put<ApiEnvelope<T>>(url, data)).data) }
function unwrap<T>(envelope: ApiEnvelope<T>) { if (!envelope.success) throw new Error(envelope.error?.message ?? 'The laboratory request failed.'); return envelope.data }
export function getLabOperationsError(error: unknown, fallback: string) { if (axios.isAxiosError<ApiEnvelope<unknown>>(error)) return error.response?.data.error?.message ?? fallback; return error instanceof Error ? error.message : fallback }
